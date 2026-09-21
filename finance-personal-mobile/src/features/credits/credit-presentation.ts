import type { Alert, Credit, CreditPlan, CreditSimulation } from '@/features/secondary/secondary-api';
import { canonicalAmount, moneyUnits } from '@/utils/decimal-money';
import { formatMoneyInput } from '@/ui/presentation';

export const creditStatus = (status: Credit['status']) =>
  status ? { ACTIVE: 'Activo', LATE: 'Atrasado', PAID: 'Pagado' }[status] : 'Estado no disponible';
export function creditMoney(
  value: number | string | undefined,
  currency: string | undefined,
  hidden: boolean,
) {
  if (hidden) return `••••••${currency ? ` ${currency}` : ''}`;
  const units = moneyUnits(value);
  return units === undefined
    ? 'No disponible'
    : `${formatMoneyInput(canonicalAmount(units))}${currency ? ` ${currency}` : ''}`;
}
export function creditProgress(credit: Credit) {
  const principal = moneyUnits(credit.principal);
  const paid = moneyUnits(credit.paidPrincipal);
  // Explicit capital paid from CreditSnapshot; interest is excluded by the server.
  if (principal === undefined || principal <= 0n || paid === undefined || paid > principal) return undefined;
  return Number((paid * 10000n) / principal) / 100;
}
export function creditGroups(credits: Credit[]) {
  return [
    { title: 'Activos', credits: credits.filter((c) => c.status === 'ACTIVE') },
    { title: 'Atrasados', credits: credits.filter((c) => c.status === 'LATE') },
    { title: 'Pagados', credits: credits.filter((c) => c.status === 'PAID') },
    { title: 'Otros créditos', credits: credits.filter((c) => !c.status) },
  ].filter((group) => group.credits.length);
}
export function creditSummary(credits: Credit[]) {
  const currencies = [...new Set(credits.map((c) => c.currency))];
  return currencies.map((currency) => {
    const group = credits.filter((c) => c.currency === currency);
    const balances = group.map((c) => moneyUnits(c.remainingBalance));
    return {
      currency,
      total:
        currency && balances.every((b) => b !== undefined)
          ? canonicalAmount(balances.reduce<bigint>((sum, b) => sum + (b ?? 0n), 0n))
          : undefined,
      active: group.filter((c) => c.status === 'ACTIVE' || c.status === 'LATE').length,
    };
  });
}
export function creditLabel(credit: Credit, hidden: boolean) {
  return `${credit.name ?? 'Crédito'}. Saldo pendiente ${creditMoney(credit.remainingBalance, credit.currency, hidden)}. Estado ${creditStatus(credit.status)}.${credit.annualRate !== undefined ? ` Tasa efectiva anual ${credit.annualRate} por ciento.` : ''}`;
}
export const linkedCreditAlerts = (alerts: Alert[], id: number) =>
  alerts.filter(
    (a) =>
      ['HIGH_INTEREST', 'OPPORTUNITY_PREPAY', 'CREDIT_BEHIND'].includes(a.code ?? '') &&
      a.data?.creditId === id,
  );
export function planRows(plan: CreditPlan) {
  return [
    { label: 'Total pagado', planned: plan.plannedTotalToDate, real: plan.realTotalPaid, money: true },
    { label: 'Capital pagado', planned: plan.plannedCapitalPaid, real: plan.realCapitalPaid, money: true },
    {
      label: 'Intereses pagados',
      planned: plan.plannedInterestPaid,
      real: plan.realInterestPaid,
      money: true,
    },
    {
      label: 'Cuotas del plan / pagos registrados',
      planned: plan.plannedInstallments,
      real: plan.realInstallments,
      money: false,
    },
  ].filter((row) => row.planned !== undefined || row.real !== undefined);
}
export function simulationRows(result: CreditSimulation) {
  return [
    { label: 'Cuota estimada', value: result.installmentValue, money: true },
    { label: 'Total del escenario', value: result.totalPaid, money: true },
    { label: 'Intereses totales', value: result.totalInterest, money: true },
    { label: 'Saldo tras la cuota indicada', value: result.balanceAfterLastPayment, money: true },
    { label: 'Cuotas restantes', value: result.remainingInstallments, money: false },
    { label: 'Cuotas ahorradas', value: result.savedInstallments, money: false },
  ].filter((row) => row.value !== undefined);
}
