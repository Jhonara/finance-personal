import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => storage.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    storage.delete(key);
  }),
}));

import * as SecureStore from 'expo-secure-store';
import {
  createMovementDraftSession,
  isMovementDraftFilled,
  movementDraftKey,
  type MovementDraftValues,
} from './movement-draft-storage';

const draft: MovementDraftValues = {
  amount: '20000',
  accountId: 4,
  categoryId: 8,
  date: '2026-10-26',
  description: 'Almuerzo',
};

beforeEach(() => {
  storage.clear();
  vi.clearAllMocks();
});

describe('encrypted movement drafts', () => {
  it('ignores empty forms and preserves a date-only edit', () => {
    expect(isMovementDraftFilled({ amount: '', date: '2026-10-26', description: '' }, '2026-10-26')).toBe(
      false,
    );
    expect(isMovementDraftFilled({ amount: '', date: '2026-10-25', description: '' }, '2026-10-26')).toBe(
      true,
    );
  });

  it('persists only form fields, without tokens, account names or server writes', async () => {
    const session = createMovementDraftSession(1, 'expense');
    await session.save(draft);
    const raw = storage.get(movementDraftKey(1, 'expense'))!;
    expect(JSON.parse(raw)).toEqual({ version: 1, ...draft });
    expect(raw).not.toMatch(/token|accountName|balance/i);
    expect(await createMovementDraftSession(1, 'expense').load()).toEqual(draft);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  });

  it('isolates users and movement types, and clears only the confirmed kind', async () => {
    await createMovementDraftSession(1, 'expense').save(draft);
    await createMovementDraftSession(1, 'income').save({ ...draft, amount: '50000' });
    await createMovementDraftSession(2, 'expense').save({ ...draft, amount: '91000' });
    expect(await createMovementDraftSession(2, 'income').load()).toBeNull();
    await createMovementDraftSession(1, 'expense').finish();
    expect(await createMovementDraftSession(1, 'expense').load()).toBeNull();
    expect((await createMovementDraftSession(1, 'income').load())?.amount).toBe('50000');
    expect((await createMovementDraftSession(2, 'expense').load())?.amount).toBe('91000');
  });

  it('does not let a stale form overwrite a newer route or resurrect a confirmed draft', async () => {
    const old = createMovementDraftSession(1, 'expense');
    await old.save(draft);
    const current = createMovementDraftSession(1, 'expense');
    await current.save({ ...draft, amount: '30000' });
    await old.save({ ...draft, amount: '99999' });
    expect((await current.load())?.amount).toBe('30000');
    await current.finish();
    await current.save(draft);
    expect(storage.has(movementDraftKey(1, 'expense'))).toBe(false);
  });

  it('rejects corrupt data and an invalid owner without revealing another user draft', async () => {
    storage.set(movementDraftKey(1, 'income'), '{broken');
    await expect(createMovementDraftSession(1, 'income').load()).rejects.toThrow('Borrador ilegible.');
    expect(() => createMovementDraftSession(0, 'income')).toThrow();
    expect(() => createMovementDraftSession(-1, 'expense')).toThrow();
  });

  it('reports a secure-storage failure and keeps the previously saved draft', async () => {
    const session = createMovementDraftSession(3, 'income');
    await session.save(draft);
    vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('storage full'));
    await expect(session.save({ ...draft, amount: '70000' })).rejects.toThrow('storage full');
    expect((await session.load())?.amount).toBe('20000');
  });
});
