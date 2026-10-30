import type { DashboardMonth } from '@/api/dashboard-api';
import type { Credit } from '@/features/secondary/secondary-api';
import { creditProgress } from '@/features/credits/credit-presentation';
import { formatDashboardPeriod, type DashboardPeriod } from '@/features/dashboard/dashboard-period';

export type ProgressDestination =
  | { pathname: '/(app)/transactions' | '/(app)/budgets'; params: { year: number; month: number } }
  | { pathname: '/(app)/saving-detail' | '/(app)/credit-detail'; params: { id: number } };
export type FinancialProgressSignal = {
  kind: 'flow' | 'budget' | 'savings' | 'credit';
  eyebrow: string;
  title: string;
  supporting: string;
  accessibility: string;
  percentage?: number;
  amount?: { value: number; currency: string };
  destination?: ProgressDestination;
};
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const validId = (id: number | undefined): id is number => Number.isSafeInteger(id) && Number(id) > 0;
const percent = (value: number) => value.toLocaleString('es-CO', { maximumFractionDigits: 1 });

// Audit: Dashboard supplies monthly cash flow/budget percentages and global saving percentages.
// Dashboard credits lack paidPrincipal. Only an already cached CreditResponse can supply it.
// Never infer paid capital from remaining debt, aggregate currencies, or query transaction history.
export function financialProgress({
  dashboard,
  period,
  cachedCredits = [],
}: {
  dashboard?: DashboardMonth;
  period: DashboardPeriod;
  cachedCredits?: Credit[];
}): FinancialProgressSignal[] {
  if (!dashboard) return [];
  const signals: FinancialProgressSignal[] = [];
  const month = formatDashboardPeriod(period);
  const { netCashFlow: flow, totalIncome: income, totalExpense: expense } = dashboard;
  const currencies = new Set([
    ...(dashboard.accounts ?? []).map((a) => a.currency),
    ...Object.keys(dashboard.assetsByCurrency ?? {}),
    ...(dashboard.recentTransactions ?? []).map((t) => t.currency),
  ]);
  const currency = [...currencies][0];
  // A zero-valued empty month is not evidence of balanced finances.
  if (
    finite(flow) &&
    finite(income) &&
    finite(expense) &&
    income >= 0 &&
    expense >= 0 &&
    (income > 0 || expense > 0) &&
    currencies.size === 1 &&
    currency &&
    /^[A-Z]{3}$/.test(currency)
  ) {
    const title =
      flow > 0
        ? 'Este mes llevas flujo positivo'
        : flow < 0
          ? 'Este mes tus salidas superan tus ingresos'
          : 'Tu flujo del mes está equilibrado';
    signals.push({
      kind: 'flow',
      eyebrow: month,
      title,
      supporting: 'Una mirada a los ingresos y gastos registrados.',
      accessibility: `${month}. ${title}.`,
      amount: { value: flow, currency },
      destination: { pathname: '/(app)/transactions', params: period },
    });
  }
  const budgets = dashboard.budgets;
  const items = budgets?.items ?? [];
  // Reject explicit mismatches rather than pairing old monthly data with the new header.
  const matching = items.every(
    (b) =>
      (b.year === undefined || b.year === period.year) && (b.month === undefined || b.month === period.month),
  );
  const attention = items.filter((b) => b.status === 'WARNING' || b.status === 'EXCEEDED').length;
  if (items.length && matching && (attention > 0 || items.every((b) => b.status === 'OK'))) {
    const percentage =
      finite(budgets?.overallPercentage) && budgets.overallPercentage >= 0
        ? budgets.overallPercentage
        : undefined;
    const title = attention
      ? attention === 1
        ? 'Una categoría necesita atención'
        : `${attention} categorías necesitan atención`
      : 'Dentro de lo planeado';
    const supporting =
      percentage === undefined
        ? 'Revisa cómo van tus límites del mes.'
        : `Has usado ${percent(percentage)}% de lo planeado.`;
    signals.push({
      kind: 'budget',
      eyebrow: month,
      title,
      supporting,
      percentage,
      accessibility: `${month}. Presupuesto. ${title}. ${percentage === undefined ? '' : `${percent(percentage)} por ciento utilizado.`}`,
      destination: { pathname: '/(app)/budgets', params: period },
    });
  }
  // Choose the active goal with highest explicit backend progress; ties use the lowest id.
  const goal = [...(dashboard.savings ?? [])]
    .filter(
      (g) => !g.completed && finite(g.progressPercent) && g.progressPercent >= 0 && g.progressPercent < 100,
    )
    .sort((a, b) => b.progressPercent! - a.progressPercent! || (a.id ?? Infinity) - (b.id ?? Infinity))[0];
  if (goal) {
    const value = goal.progressPercent!;
    const name = goal.name?.trim() || 'Tu meta';
    signals.push({
      kind: 'savings',
      eyebrow: 'Ahorro · avance actual',
      title: `${name} está al ${percent(value)}%`,
      supporting: 'Cada aporte te acerca a tu objetivo.',
      percentage: value,
      accessibility: `Meta ${name}, ${percent(value)} por ciento completada.`,
      ...(validId(goal.id)
        ? { destination: { pathname: '/(app)/saving-detail' as const, params: { id: goal.id } } }
        : {}),
    });
  }
  const credit = cachedCredits
    .filter((c) => c.status === 'ACTIVE' || c.status === 'LATE')
    .map((c) => ({ credit: c, percentage: creditProgress(c) }))
    .filter((c) => c.percentage !== undefined && c.percentage >= 0 && c.percentage <= 100)
    .sort(
      (a, b) => b.percentage! - a.percentage! || (a.credit.id ?? Infinity) - (b.credit.id ?? Infinity),
    )[0];
  if (credit) {
    const name = credit.credit.name?.trim() || 'tu crédito';
    signals.push({
      kind: 'credit',
      eyebrow: 'Crédito · avance actual',
      title: `Has avanzado ${percent(credit.percentage!)}% en ${name}`,
      supporting: 'Capital pagado según los pagos registrados.',
      percentage: credit.percentage,
      accessibility: `${name}. ${percent(credit.percentage!)} por ciento del capital pagado.`,
      ...(validId(credit.credit.id)
        ? { destination: { pathname: '/(app)/credit-detail' as const, params: { id: credit.credit.id } } }
        : {}),
    });
  }
  // Stable priority: flow, budget, savings, then credit. At most three signals.
  return signals.slice(0, 3);
}
