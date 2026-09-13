import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));

import { firstRunStorage } from './first-run-storage';

describe('first run storage keys', () => {
  it('keeps intro state isolated by user', () => {
    expect(firstRunStorage.introKey(10)).not.toBe(firstRunStorage.introKey(11));
  });

  it('keeps first-use hints separate from intro state', () => {
    expect(firstRunStorage.hintKey(10, 'fab')).not.toBe(firstRunStorage.introKey(10));
  });

  it('uses a separate completion marker for the same user', () => {
    expect(firstRunStorage.completionKey(10)).not.toBe(firstRunStorage.introKey(10));
  });

  it('marks an intro as seen without affecting another user key', async () => {
    const first = firstRunStorage.introKey(10);
    const second = firstRunStorage.introKey(11);
    await firstRunStorage.mark(first);
    expect(first).not.toBe(second);
  });
});
