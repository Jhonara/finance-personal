import { beforeEach, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => new Map<string, string>());
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => saved.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    saved.set(key, value);
  }),
}));

import {
  getCaptureDiagnostics,
  markCaptureSynchronized,
  recordCaptureDiagnostic,
} from './capture-diagnostics';

beforeEach(() => saved.clear());

it('keeps diagnostic metadata separated by owner and records the last successful sync', async () => {
  await recordCaptureDiagnostic('7', 'NOTIFICATION', 'ACCEPTED', 'SAVED_PENDING');
  await recordCaptureDiagnostic('8', 'IMAGE', 'FAILED', 'OFFLINE_OR_TIMEOUT');
  await markCaptureSynchronized('7');
  const first = await getCaptureDiagnostics('7');
  expect(first.events).toMatchObject([{ source: 'NOTIFICATION', reason: 'SAVED_PENDING' }]);
  expect(first.lastSyncAt).toBeTruthy();
  expect((await getCaptureDiagnostics('8')).events).toMatchObject([{ source: 'IMAGE' }]);
  expect((await getCaptureDiagnostics('8')).lastSyncAt).toBeUndefined();
  expect(saved.size).toBe(2);
});

it('rejects unknown or sensitive reason strings instead of saving them', async () => {
  await recordCaptureDiagnostic('7', 'NOTIFICATION', 'FAILED', 'OTP 123456' as 'SERVER_REJECTED');
  expect((await getCaptureDiagnostics('7')).events).toEqual([]);
  expect([...saved.values()].join('')).not.toContain('123456');
});
