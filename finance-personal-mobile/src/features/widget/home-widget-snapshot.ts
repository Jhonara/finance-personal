import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from '@/features/dashboard/dashboard-period';
import { formatMoney } from '@/utils/money';
import type { HomeWidgetSnapshot } from './home-widget-types';

/** Dashboard already supplies balances and monthly totals. Never sum transactions inside the widget. */
export function toHomeWidgetSnapshot(
  ownerId: string,
  dashboard: DashboardMonth,
  period: DashboardPeriod,
  updatedAt: number,
): HomeWidgetSnapshot {
  const currencies = [
    ...new Set(
      (dashboard.accounts ?? [])
        .map((account) => account.currency)
        .filter((currency): currency is string => typeof currency === 'string' && currency.length > 0),
    ),
  ].sort();
  const currency = currencies.includes('COP') ? 'COP' : (currencies[0] ?? '');
  const balance = currency ? dashboard.assetsByCurrency?.[currency] : undefined;
  const singleCurrency = currencies.length === 1;
  const amount = (value: number | undefined) =>
    currency && typeof value === 'number' && Number.isFinite(value)
      ? formatMoney(value, currency)
      : 'Sin datos';
  return {
    ownerId,
    month: `${period.year}-${String(period.month).padStart(2, '0')}`,
    currency,
    balance: amount(balance),
    income: singleCurrency ? amount(dashboard.totalIncome) : '',
    expense: singleCurrency ? amount(dashboard.totalExpense) : '',
    monthlyAvailable: String(singleCurrency),
    updatedAt: String(updatedAt),
  };
}
