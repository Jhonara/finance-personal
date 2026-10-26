import { describe, expect, it } from 'vitest';
import type { DashboardMonth } from '@/api/dashboard-api';
import { toHomeWidgetSnapshot } from './home-widget-snapshot';

const period = { year: 2026, month: 10 };
const snapshot = (dashboard: DashboardMonth) =>
  toHomeWidgetSnapshot('user-3', dashboard, period, 1_782_000_000_000);

describe('Android home widget snapshot', () => {
  it('uses only the server dashboard balance and monthly totals for one currency', () => {
    const result = snapshot({
      accounts: [{ id: 1, currency: 'COP', active: true }],
      assetsByCurrency: { COP: 350000 },
      totalIncome: 3000000,
      totalExpense: 840000,
    });
    expect(result).toMatchObject({
      ownerId: 'user-3',
      currency: 'COP',
      month: '2026-10',
      monthlyAvailable: 'true',
    });
    expect(result.balance).toContain('350.000');
    expect(result.income).toContain('3.000.000');
    expect(result.expense).toContain('840.000');
  });

  it('does not present monthly totals that combine different currencies', () => {
    const result = snapshot({
      accounts: [
        { id: 1, currency: 'COP', active: true },
        { id: 2, currency: 'USD', active: false },
      ],
      assetsByCurrency: { COP: 350000, USD: 20 },
      totalIncome: 3000020,
      totalExpense: 840005,
    });
    expect(result.balance).toContain('350.000');
    expect(result.monthlyAvailable).toBe('false');
    expect(result.income).toBe('');
    expect(result.expense).toBe('');
  });

  it('does not invent a zero balance when the dashboard lacks account data', () => {
    const result = snapshot({ totalIncome: 100, totalExpense: 50 });
    expect(result.balance).toBe('Sin datos');
    expect(result.monthlyAvailable).toBe('false');
  });
});
