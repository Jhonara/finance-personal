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

export const reportViews = [
  { id: 'summary', label: 'Mi mes', icon: 'analytics-outline', monthly: true },
  { id: 'expenses', label: 'Gastos', icon: 'pie-chart-outline', monthly: true },
  { id: 'budgets', label: 'Presupuestos', icon: 'speedometer-outline', monthly: true },
  { id: 'accounts', label: 'Cuentas', icon: 'wallet-outline', monthly: false },
  { id: 'credits', label: 'Créditos', icon: 'card-outline', monthly: false },
  { id: 'savings', label: 'Metas', icon: 'flag-outline', monthly: false },
] as const;
export type ReportView = (typeof reportViews)[number]['id'];
export type TrendPoint = DashboardPeriod & { income?: number; expense?: number };

// A successful empty response means no records. A missing response is never a zero.
export function currencyMonth(data: ReportMonth | undefined, currency: string): CurrencyMonth | undefined {
  return data === undefined
    ? undefined
    : (data[currency] ?? { income: 0, expense: 0, expensesByCategory: {} });
}

export function comparisonPercent(current: number | undefined, previous: number | undefined) {
  if (
    current === undefined ||
    previous === undefined ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous <= 0 ||
    current < 0
  )
    return undefined;
  return ((current - previous) / previous) * 100;
}

export function categoryRows(current?: CurrencyMonth, previous?: CurrencyMonth) {
  return Object.entries(current?.expensesByCategory ?? {})
    .filter(([, amount]) => Number.isFinite(amount) && amount !== 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: current && current.expense > 0 && amount > 0 ? (amount / current.expense) * 100 : undefined,
      previous: previous === undefined ? undefined : (previous.expensesByCategory[name] ?? 0),
    }));
}

export function periodContext(period: DashboardPeriod, today: DashboardPeriod) {
  const selected = period.year * 12 + period.month;
  const now = today.year * 12 + today.month;
  return selected === now
    ? 'Mes en curso · puede cambiar con nuevos registros'
    : selected > now
      ? 'Mes futuro · solo registros que tengan fecha en este mes'
      : 'Mes terminado · según los registros que guardaste';
}

export function shortReportMonth(period: DashboardPeriod) {
  return new Intl.DateTimeFormat('es-CO', { month: 'short' })
    .format(new Date(period.year, period.month - 1, 1))
    .replace('.', '');
}
