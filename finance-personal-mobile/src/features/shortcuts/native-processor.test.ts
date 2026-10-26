import { describe, expect, it, vi } from 'vitest';
import { nativePurchaseInput, processNativePurchase } from './native-processor';
import type { NativeInvocation } from './native-types';

const invocation: NativeInvocation = {
  id: '7bdbb708-f438-4565-a606-b57b7395c5df',
  ownerId: '12',
  name: 'importWallet',
  params: {
    amount: '12500.25',
    currency: 'COP',
    merchant: 'Café',
    occurredAt: '2026-10-24T12:10:00-05:00',
    cardReference: 'visa-personal',
    eventReference: 'bank-event-123',
  },
};
describe('native financial invocations', () => {
  it('preserves supplied Wallet fields and offset without inventing missing data', () => {
    expect(nativePurchaseInput(invocation, '12')).toMatchObject({
      ownerId: 12,
      invocationId: invocation.id,
      action: 'importWallet',
      amount: 12500.25,
      occurredAt: invocation.params.occurredAt,
      cardReference: 'visa-personal',
      eventReference: 'bank-event-123',
    });
    expect(nativePurchaseInput({ ...invocation, params: {} }, '12')).toEqual({
      ownerId: 12,
      invocationId: invocation.id,
      action: 'importWallet',
      amount: undefined,
    });
  });
  it.each<Record<string, string>>([
    { amount: '-1' },
    { amount: '12.500,25' },
    { amount: '0' },
    { amount: '1.12345' },
    { currency: 'pesos' },
    { occurredAt: '2026-02-30' },
    { token: 'not-accepted' },
  ])('rejects invalid input %j before mutation', async (params) => {
    const commit = vi.fn();
    const complete = vi.fn();
    await expect(
      processNativePurchase({ ...invocation, params }, '12', {
        commit,
        bridge: { complete },
        isCurrent: () => true,
      }),
    ).rejects.toThrow();
    expect(commit).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
  it('requires expense fields and rejects another user or action', () => {
    expect(() => nativePurchaseInput({ ...invocation, name: 'registerExpense', params: {} }, '12')).toThrow();
    expect(() => nativePurchaseInput(invocation, '13')).toThrow();
    expect(() => nativePurchaseInput({ ...invocation, name: 'deleteAccount' }, '12')).toThrow();
  });
  it.each([401, 409, 503])('keeps pending on a session/server failure %s', async (status) => {
    const complete = vi.fn();
    await expect(
      processNativePurchase(invocation, '12', {
        commit: vi.fn().mockRejectedValue({ response: { status } }),
        bridge: { complete },
        isCurrent: () => true,
      }),
    ).rejects.toBeDefined();
    expect(complete).not.toHaveBeenCalled();
  });
  it('keeps the same idempotency key after a lost response or failed acknowledgement', async () => {
    const commit = vi.fn().mockResolvedValue({ id: 22, status: 'PENDING' });
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new Error('keychain unavailable'))
      .mockResolvedValue(undefined);
    const deps = { commit, bridge: { complete }, isCurrent: () => true };
    await expect(processNativePurchase(invocation, '12', deps)).rejects.toThrow();
    await processNativePurchase(invocation, '12', deps);
    expect(commit.mock.calls[0]?.[0]).toEqual(commit.mock.calls[1]?.[0]);
    expect(complete).toHaveBeenLastCalledWith('12', invocation.id);
  });
  it.each(['PENDING', 'POSTED', 'LINKED', 'DISCARDED'])(
    'accepts the durable receipt %s before removing',
    async (status) => {
      const sequence: string[] = [];
      await processNativePurchase(invocation, '12', {
        commit: async () => {
          sequence.push('server');
          return { id: 22, status };
        },
        bridge: {
          complete: async () => {
            sequence.push('remove');
          },
        },
        isCurrent: () => true,
      });
      expect(sequence).toEqual(['server', 'remove']);
    },
  );
  it('never acknowledges a malformed receipt or a response after switching sessions', async () => {
    const complete = vi.fn();
    await expect(
      processNativePurchase(invocation, '12', {
        commit: async () => ({}),
        bridge: { complete },
        isCurrent: () => true,
      }),
    ).rejects.toThrow();
    let current = true;
    await processNativePurchase(invocation, '12', {
      commit: async () => {
        current = false;
        return { id: 22, status: 'PENDING' };
      },
      bridge: { complete },
      isCurrent: () => current,
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
