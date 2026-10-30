import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  values: new Map<string, string>(),
  post: vi.fn(),
  user: vi.fn(),
  permissions: vi.fn(),
  request: vi.fn(),
  schedule: vi.fn(),
  channel: vi.fn(),
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => mocks.values.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    mocks.values.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    mocks.values.delete(key);
  }),
}));
vi.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  AndroidNotificationVisibility: { PRIVATE: 2 },
  setNotificationChannelAsync: mocks.channel,
  getPermissionsAsync: mocks.permissions,
  requestPermissionsAsync: mocks.request,
  scheduleNotificationAsync: mocks.schedule,
  dismissNotificationAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(),
  dismissAllNotificationsAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
}));
vi.mock('@/auth/auth-provider', () => ({ api: { post: mocks.post } }));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: mocks.user }));

import {
  getNoticePreferences,
  currentNoticeEpoch,
  invalidateNoticeSession,
  notifyDetectedDraft,
  parseNoticeTarget,
  requestNoticePermission,
  saveNoticePreferences,
} from './detected-notices';
import { createDetectedDraft, detectedRequestKey } from './detected-intake';
import { prepareCaptureText, type AcceptedSharedText } from './shared-text-intake';
import type { Draft } from '@/features/inbox/inbox-api';

const draft = (id: number): Draft => ({
  id,
  status: 'PENDING',
  version: 0,
  source: 'IMAGE',
  fields: { kind: 'EXPENSE', description: 'Café Centro', amount: 25000, currency: 'COP' },
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.values.clear();
  mocks.permissions.mockResolvedValue({ granted: true, canAskAgain: true });
  mocks.request.mockResolvedValue({ granted: true });
  mocks.schedule.mockResolvedValue('notice');
  mocks.user.mockResolvedValue({ id: 7 });
  mocks.post.mockImplementation(async (_path: string, body: { requestKey: string }) => ({
    data: draft(body.requestKey.endsWith('second') ? 102 : 101),
  }));
});

it('uses a private Android channel and does not request permission when posting is already allowed', async () => {
  expect(await requestNoticePermission()).toBe(true);
  expect(mocks.channel).toHaveBeenCalledWith(
    'detected-movements',
    expect.objectContaining({
      name: 'Movimientos detectados',
      lockscreenVisibility: 2,
    }),
  );
  expect(mocks.request).not.toHaveBeenCalled();
});

it('keeps amounts and merchant hidden by default and emits once for one server pending ID', async () => {
  await saveNoticePreferences('7', { enabled: true, showAmount: false, showMerchant: false });
  expect(await notifyDetectedDraft('7', draft(101))).toBe(true);
  expect(await notifyDetectedDraft('7', draft(101))).toBe(false);
  expect(mocks.schedule).toHaveBeenCalledOnce();
  expect(mocks.schedule).toHaveBeenCalledWith(
    expect.objectContaining({
      identifier: 'detected-7-101',
      content: {
        title: 'Movimiento detectado',
        body: 'Tienes un movimiento pendiente de revisión.',
        data: { type: 'detected-movement', ownerId: '7', draftId: 101 },
      },
    }),
  );
});

it('notifies two real movements with identical merchant and amount when their pending IDs differ', async () => {
  await saveNoticePreferences('7', { enabled: true, showAmount: true, showMerchant: true });
  await notifyDetectedDraft('7', draft(101));
  await notifyDetectedDraft('7', draft(102));
  expect(mocks.schedule).toHaveBeenCalledTimes(2);
  expect(mocks.schedule.mock.calls[0]![0].content.body).toContain('Café Centro');
  expect(mocks.schedule.mock.calls[0]![0].content.body).toContain('25.000 COP');
});

it('does not notify without permission while keeping the preference and pending ID', async () => {
  await saveNoticePreferences('7', { enabled: true, showAmount: false, showMerchant: false });
  mocks.permissions.mockResolvedValue({ granted: false, canAskAgain: false });
  expect(await notifyDetectedDraft('7', draft(101))).toBe(false);
  expect(mocks.schedule).not.toHaveBeenCalled();
  expect((await getNoticePreferences('7')).enabled).toBe(true);
});

it('does not publish an old user notice after the session changes', async () => {
  await saveNoticePreferences('7', { enabled: true, showAmount: false, showMerchant: false });
  const oldEpoch = currentNoticeEpoch();
  invalidateNoticeSession();
  expect(await notifyDetectedDraft('7', draft(101), oldEpoch)).toBe(false);
  expect(mocks.schedule).not.toHaveBeenCalled();
});

it('isolates notification preferences and rejects another owner or malformed target', async () => {
  await saveNoticePreferences('7', { enabled: true, showAmount: true, showMerchant: false });
  expect(await getNoticePreferences('8')).toEqual({ enabled: false, showAmount: false, showMerchant: false });
  expect(await notifyDetectedDraft('8', draft(101))).toBe(false);
  expect(parseNoticeTarget({ type: 'detected-movement', ownerId: '7', draftId: 101 })).toEqual({
    ownerId: '7',
    draftId: 101,
  });
  expect(parseNoticeTarget({ type: 'detected-movement', ownerId: '7', draftId: '101' })).toBeNull();
});

it('saves parsed fields only with a stable event key, never posts to the ledger', async () => {
  const intake: AcceptedSharedText = {
    identity: 'NOTIFICATION-42-1234',
    suggestion: {
      source: 'NOTIFICATION',
      kind: 'EXPENSE',
      description: 'Café Centro',
      amount: '25000',
      currency: 'COP',
      effectiveDate: '2026-10-27',
      confidence: 'HIGH',
      warnings: [],
    },
    intake: {
      identity: 'NOTIFICATION-42-1234',
      demo: false,
      source: 'NOTIFICATION',
      values: {
        kind: 'EXPENSE',
        description: 'Café Centro',
        amount: '25000',
        currency: 'COP',
        effectiveDate: '2026-10-27',
      },
    },
  };
  expect(detectedRequestKey(intake, 'first')).toBe(detectedRequestKey(intake, 'first'));
  expect(detectedRequestKey(intake, 'first')).not.toBe(detectedRequestKey(intake, 'second'));
  await createDetectedDraft(intake, 'first');
  expect(mocks.post).toHaveBeenCalledWith(
    '/inbox',
    expect.objectContaining({
      source: 'NOTIFICATION',
      fields: expect.objectContaining({ amount: 25000 }),
    }),
  );
  expect(mocks.post).toHaveBeenCalledTimes(1);
});

it('retries the same receipt after a network failure with the identical idempotency key', async () => {
  const intake: AcceptedSharedText = {
    identity: 'IMAGE-44-1234',
    suggestion: {
      source: 'IMAGE',
      kind: 'EXPENSE',
      description: 'Tienda',
      amount: '18000',
      currency: 'COP',
      effectiveDate: '2026-10-27',
      confidence: 'HIGH',
      warnings: [],
    },
    intake: {
      identity: 'IMAGE-44-1234',
      demo: false,
      source: 'IMAGE',
      values: {
        kind: 'EXPENSE',
        description: 'Tienda',
        amount: '18000',
        currency: 'COP',
        effectiveDate: '2026-10-27',
      },
    },
  };
  mocks.post.mockRejectedValueOnce({ status: 503 });
  await expect(createDetectedDraft(intake)).rejects.toEqual({ status: 503 });
  await createDetectedDraft(intake);
  expect(mocks.post).toHaveBeenCalledTimes(2);
  expect(mocks.post.mock.calls[0]![1].requestKey).toBe(mocks.post.mock.calls[1]![1].requestKey);
  expect(mocks.post.mock.calls[0]![0]).toBe('/inbox');
});

it('retries with one key when the server saved a pending movement but its reply was lost', async () => {
  const intake = prepareCaptureText('Compraste COP 18.000 en Tienda Ejemplo el 28/10/2026', 'NOTIFICATION')!;
  let serverKey = '';
  mocks.post.mockImplementationOnce(async (_path: string, body: { requestKey: string }) => {
    serverKey = body.requestKey; // The server committed, but the mobile never received its response.
    throw new Error('connection lost after commit');
  });
  mocks.post.mockImplementationOnce(async (_path: string, body: { requestKey: string }) => {
    expect(body.requestKey).toBe(serverKey);
    return { data: draft(101) };
  });
  await expect(createDetectedDraft(intake, 'same-android-event')).rejects.toThrow();
  expect((await createDetectedDraft(intake, 'same-android-event')).id).toBe(101);
  expect(mocks.post).toHaveBeenCalledTimes(2);
  expect(mocks.post.mock.calls.every((call) => call[0] === '/inbox')).toBe(true);
});

it('does not publish a notice for another user when the account changes during a response', async () => {
  const intake = prepareCaptureText('Compraste COP 18.000 en Tienda Ejemplo el 28/10/2026', 'NOTIFICATION')!;
  mocks.user.mockResolvedValueOnce({ id: 7 }).mockResolvedValueOnce({ id: 8 });
  await expect(createDetectedDraft(intake, 'same-android-event')).rejects.toThrow('La sesión cambió');
  expect(mocks.schedule).not.toHaveBeenCalled();
});

it('never posts an old bank candidate under a new account', async () => {
  const intake = prepareCaptureText('Compraste COP 18.000 en Tienda Ejemplo el 28/10/2026', 'NOTIFICATION')!;
  mocks.user.mockResolvedValueOnce({ id: 8 });
  await expect(createDetectedDraft(intake, 'old-event', '7')).rejects.toThrow('La sesión cambió');
  expect(mocks.post).not.toHaveBeenCalled();
  expect(mocks.schedule).not.toHaveBeenCalled();
  expect([...mocks.values.keys()].some((key) => key.endsWith('.8'))).toBe(false);
});
