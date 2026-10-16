import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';

export type CurrencyMonth = {
  income: number;
  expense: number;
  expensesByCategory: Record<string, number>;
};
export type ReportMonth = Record<string, CurrencyMonth>;

export function reportCurrencies(months: (ReportMonth | undefined)[], accountCurrencies: string[]) {
  return [...new Set([...accountCurrencies, ...months.flatMap((month) => Object.keys(month ?? {}))])]
    .filter((currency) => /^[A-Z]{3}$/.test(currency))
    .sort();
}

export function reportMonths(period: DashboardPeriod, count = 6): DashboardPeriod[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(period.year, period.month - count + index, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
}

export function reportCategories(data?: CurrencyMonth) {
  return Object.entries(data?.expensesByCategory ?? {})
    .filter((entry): entry is [string, number] => Number.isFinite(entry[1]) && entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);
}
