import { describe, expect, it } from 'vitest';
import { homeVisibility } from './home-visibility';

describe('Home progressive disclosure', () => {
  it('keeps an empty account state free of monthly data even if old dashboard fields exist', () => {
    expect(homeVisibility({ accounts: [], totalIncome: 100 }, false)).toMatchObject({
      hasAccounts: false,
      showFirstMovement: false,
    });
  });
  it('shows the first movement step only when history confirms none exists', () => {
    const data = { accounts: [{ id: 1, active: true, currency: 'COP' }] };
    expect(homeVisibility(data, false).showFirstMovement).toBe(true);
    expect(homeVisibility(data, undefined).showFirstMovement).toBe(false);
    expect(homeVisibility({ ...data, totalExpense: 200 }, false).showFirstMovement).toBe(false);
  });
  it('does not label aggregated totals with one currency when accounts use several', () => {
    const state = homeVisibility({
      accounts: [
        { id: 1, active: true, currency: 'COP' },
        { id: 2, active: true, currency: 'USD' },
      ],
      totalIncome: 100,
    });
    expect(state.hasMonthlyTotals).toBe(true);
    expect(state.monthlyCurrency).toBeUndefined();
  });
});
