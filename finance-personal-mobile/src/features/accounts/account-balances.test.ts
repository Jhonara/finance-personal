import { describe, expect, it } from 'vitest';

import { balanceForAccount } from './account-balances';

describe('balanceForAccount', () => {
  it('uses the server-calculated dashboard balance for the selected account', () => {
    expect(
      balanceForAccount(
        [
          { id: 1, balance: 125000 },
          { id: 2, balance: -4000 },
        ],
        2,
      ),
    ).toBe(-4000);
  });

  it('falls back safely while the dashboard is loading', () => {
    expect(balanceForAccount(undefined, 1)).toBe(0);
  });
});
