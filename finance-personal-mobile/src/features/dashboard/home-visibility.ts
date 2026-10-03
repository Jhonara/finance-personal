import type { DashboardMonth } from '@/api/dashboard-api';

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function homeVisibility(data: DashboardMonth, hasHistoricalMovement?: boolean) {
  const accounts = (data.accounts ?? []).filter((account) => account.active);
  const hasMonthlyTotals =
    (finite(data.totalIncome) && data.totalIncome > 0) ||
    (finite(data.totalExpense) && data.totalExpense > 0);
  const currencies = new Set([
    ...accounts
      .map((account) => account.currency)
      .filter((currency): currency is string => Boolean(currency)),
    ...(data.recentTransactions ?? [])
      .map((transaction) => transaction.currency)
      .filter((currency): currency is string => Boolean(currency)),
  ]);
  const monthlyCurrency = currencies.size === 1 ? [...currencies][0] : undefined;
  return {
    accounts,
    hasAccounts: accounts.length > 0,
    hasMonthlyTotals,
    monthlyCurrency,
    showFirstMovement: accounts.length > 0 && hasHistoricalMovement === false && !hasMonthlyTotals,
  };
}
