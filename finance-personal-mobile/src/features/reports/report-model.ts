import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';

export function reportCurrency(data?: DashboardMonth): string | undefined {
  const currencies = new Set([
    ...(data?.accounts ?? []).map((account) => account.currency).filter(Boolean),
    ...(data?.recentTransactions ?? []).map((transaction) => transaction.currency).filter(Boolean),
  ]);
  return currencies.size === 1 ? [...currencies][0] : undefined;
}

export function reportMonths(period: DashboardPeriod, count = 6): DashboardPeriod[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(period.year, period.month - count + index, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
}

export function reportCategories(data?: DashboardMonth) {
  return Object.entries(data?.expenseSummary?.totalByCategory ?? {})
    .filter((entry): entry is [string, number] => Number.isFinite(entry[1]) && entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);
}
