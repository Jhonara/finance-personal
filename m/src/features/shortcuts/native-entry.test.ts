import { describe, expect, it } from 'vitest';
import { hasOpenedNativeRoute, nativeEntryRoute } from './native-entry';
describe('native entries into existing flows', () => {
  it.each([
    ['openIncome', '/(app)/new-income'],
    ['openTransfer', '/(app)/new-transfer'],
    ['openBalances', '/(app)/accounts'],
  ])('routes %s without posting financial data', (name, route) => {
    expect(nativeEntryRoute({ id: 'invocation', ownerId: '1', name: name!, params: {} }, '1')).toBe(route);
    expect(hasOpenedNativeRoute(route!.replace('/(app)', ''), route!)).toBe(true);
    expect(hasOpenedNativeRoute('/shortcuts', route!)).toBe(false);
  });
  it('rejects unexpected parameters and another owner', () => {
    const invocation = { id: 'invocation', ownerId: '1', name: 'openIncome', params: { amount: '1' } };
    expect(() => nativeEntryRoute(invocation, '1')).toThrow();
    expect(() => nativeEntryRoute({ ...invocation, params: {} }, '2')).toThrow();
  });
});
