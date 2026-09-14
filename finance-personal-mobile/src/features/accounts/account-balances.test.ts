import { describe, expect, it } from 'vitest';

import { balanceForAccount, totalAccountBalance } from './account-balances';

describe('balanceForAccount', () => {
  it('uses the server-calculated dashboard balance for the selected account', () => {
    expect(
      balanceForAccount(
        {
          isPending: false,
          isError: false,
          data: {
            accounts: [
              { id: 1, balance: 125000 },
              { id: 2, balance: -4000 },
            ],
          },
        },
        2,
      ),
    ).toEqual({ status: 'known', amount: -4000 });
  });

  it('keeps loading distinct from zero', () => {
    expect(balanceForAccount({ isPending: true, isError: false }, 1)).toEqual({ status: 'loading' });
  });

  it('keeps errors distinct from zero', () => {
    expect(balanceForAccount({ isPending: false, isError: true }, 1)).toEqual({ status: 'unavailable' });
  });

  it.each([0, 125000, -4000])('preserves a known balance of %s', (amount) => {
    expect(
      balanceForAccount(
        { isPending: false, isError: false, data: { accounts: [{ id: 1, balance: amount }] } },
        1,
      ),
    ).toEqual({ status: 'known', amount });
  });

  it.each([false, true])('preserves cached data when a refetch error is %s', (isError) => {
    expect(
      balanceForAccount({ isPending: false, isError, data: { accounts: [{ id: 1, balance: 110000 }] } }, 1),
    ).toEqual({ status: 'known', amount: 110000 });
  });

  it.each([undefined, NaN, Infinity])('treats an absent or invalid amount as unavailable (%s)', (balance) => {
    expect(
      balanceForAccount({ isPending: false, isError: false, data: { accounts: [{ id: 1, balance }] } }, 1),
    ).toEqual({ status: 'unavailable' });
  });

  it('never borrows another account balance', () => {
    const source = { isPending: false, isError: false, data: { accounts: [{ id: 2, balance: 500 }] } };
    expect(balanceForAccount(source, 1)).toEqual({ status: 'unavailable' });
    expect(balanceForAccount(source, undefined)).toEqual({ status: 'unavailable' });
  });

  it.each(['loading', 'unavailable'] as const)(
    'does not show a partial currency total when a balance is %s',
    (status) => {
      expect(totalAccountBalance([{ status: 'known', amount: 500 }, { status }])).toEqual({ status });
    },
  );

  it('sums known balances including a real zero', () => {
    expect(
      totalAccountBalance([
        { status: 'known', amount: 500 },
        { status: 'known', amount: 0 },
      ]),
    ).toEqual({ status: 'known', amount: 500 });
  });
});
