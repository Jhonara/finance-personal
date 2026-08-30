import type { components } from '@/api/generated/schema';
import type { BudgetVisualStatus, TransactionKind } from '@/ui/presentation';

type Dashboard = components['schemas']['DashboardMonthResponse'];
const kinds: TransactionKind[] = [
  'INCOME',
  'EXPENSE',
  'TRANSFER',
  'OPENING_BALANCE',
  'REVERSAL',
  'CREDIT_DISBURSEMENT',
  'CREDIT_PAYMENT',
];
export function currencyEntries(
  values?: Record<string, number>,
): Array<{ currency: string; amount: number }> {
  return Object.entries(values ?? {}).map(([currency, amount]) => ({ currency, amount }));
}
export function toTransaction(transaction: components['schemas']['DashboardRecentTransactionResponse']) {
  const type = kinds.includes(transaction.type as TransactionKind)
    ? (transaction.type as TransactionKind)
    : 'REVERSAL';
  return {
    type,
    title: transaction.description || transaction.categoryName || 'Movimiento',
    subtitle:
      [transaction.effectiveDate, transaction.accountName].filter(Boolean).join(' · ') || 'Sin detalle',
    amount: transaction.amount ?? 0,
    currency: transaction.currency ?? 'COP',
  };
}
export function toBudget(budget: components['schemas']['BudgetResponse']) {
  return {
    label: budget.categoryName ?? 'Presupuesto',
    spent: budget.spentAmount ?? 0,
    limit: budget.limitAmount ?? 0,
    remaining: budget.remainingAmount ?? 0,
    percentage: budget.percentageUsed ?? 0,
    status: (budget.status ?? 'OK') as BudgetVisualStatus,
  };
}
export function alertPresentation(alert: components['schemas']['AlertResponse']) {
  const titles: Record<string, string> = {
    BUDGET_WARNING: 'Presupuesto en atención',
    BUDGET_EXCEEDED: 'Presupuesto excedido',
    SPEND_SPIKE: 'Gasto inusual',
    CREDIT_BEHIND: 'Crédito atrasado',
    HIGH_INTEREST: 'Interés alto',
    OPPORTUNITY_PREPAY: 'Oportunidad de prepago',
  };
  const severity =
    alert.severity?.toUpperCase() === 'CRITICAL'
      ? 'critical'
      : alert.severity?.toUpperCase() === 'WARNING'
        ? 'warning'
        : 'info';
  return {
    severity: severity as 'info' | 'warning' | 'critical',
    title: titles[alert.code ?? ''] ?? 'Alerta financiera',
    description: alert.message ?? 'Revisa el estado de tus finanzas.',
  };
}
export function budgetCurrency(dashboard: Dashboard): string {
  return (
    dashboard.accounts?.find((account) => account.active)?.currency ??
    dashboard.accounts?.[0]?.currency ??
    'COP'
  );
}
