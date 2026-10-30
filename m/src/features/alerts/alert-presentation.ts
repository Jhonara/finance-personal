import type { Alert, SeenAlert } from '@/features/secondary/secondary-api';
import { formatPrivateMoney } from '@/privacy/privacy-format';

export const alertLevels = ['Importante', 'Atención', 'Información'] as const;
export type AlertLevel = (typeof alertLevels)[number];
const definitions: Record<string, { title: string; description: string; level: AlertLevel }> = {
  RECURRING_PENDING: {
    title: 'Pagos programados por confirmar',
    description:
      'Revisa los ingresos y gastos que llegaron a su fecha. Hasta confirmarlos no cambian tu saldo.',
    level: 'Atención',
  },
  BUDGET_WARNING: {
    title: 'Presupuesto cerca del límite',
    description: 'Alcanzaste el límite de alerta de este presupuesto.',
    level: 'Atención',
  },
  BUDGET_EXCEEDED: {
    title: 'Presupuesto excedido',
    description: 'Gastaste más de lo planeado para esta categoría.',
    level: 'Importante',
  },
  CREDIT_BEHIND: {
    title: 'Pago de crédito pendiente',
    description:
      'Según los pagos anotados, hay cuotas por cubrir. Si ya pagaste, anótalo en el crédito o actualiza el saldo con tu extracto.',
    level: 'Importante',
  },
  HIGH_INTEREST: {
    title: 'Intereses por encima del plan',
    description:
      'Los intereses anotados superan la estimación del plan. Revisa el detalle del crédito y compáralo con tu extracto.',
    level: 'Atención',
  },
  OPPORTUNITY_PREPAY: {
    title: 'Podrías explorar un abono adicional',
    description: 'Revisa una simulación antes de decidir.',
    level: 'Información',
  },
  SPEND_SPIKE: {
    title: 'Gasto inusual',
    description: 'Tus gastos aumentaron frente al mes anterior.',
    level: 'Atención',
  },
  ALL_GOOD: {
    title: 'Todo en orden',
    description: 'No encontramos alertas importantes para este período.',
    level: 'Información',
  },
};
export function positiveId(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
export function presentAlert(
  alert: Alert,
  creditContext?: { name: string; currency: string; hidden: boolean },
  hidden = creditContext?.hidden ?? true,
) {
  const code = alert.code ?? '';
  const definition = definitions[code] ?? {
    title: 'Aviso financiero',
    description: 'Revisa tu información financiera.',
    level: 'Información' as const,
  };
  const data = alert.data ?? {};
  const currency = creditContext?.currency ?? (typeof data.currency === 'string' ? data.currency : undefined);
  const money = (value: unknown) =>
    currency && typeof value === 'number' && Number.isFinite(value)
      ? formatPrivateMoney(value, currency, hidden)
      : undefined;
  const budget = code === 'BUDGET_WARNING' || code === 'BUDGET_EXCEEDED';
  const credit = ['CREDIT_BEHIND', 'HIGH_INTEREST', 'OPPORTUNITY_PREPAY'].includes(code);
  const relatedId = positiveId(budget ? data.budgetId : credit ? data.creditId : undefined);
  const year = positiveId(data.year);
  const month = positiveId(data.month);
  const period = year && year <= 9999 && month && month <= 12 ? { year, month } : undefined;
  const context: string[] = [];
  if (code === 'RECURRING_PENDING' && typeof data.count === 'number' && data.count > 0)
    context.push(`${data.count} por confirmar`);
  if (budget && typeof data.categoryName === 'string' && data.categoryName.trim())
    context.push(`Categoría ${data.categoryName}`);
  if ((budget || code === 'SPEND_SPIKE') && period)
    context.push(
      `${new Date(period.year, period.month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}${currency ? ` · ${currency}` : ''}`,
    );
  if (credit && relatedId)
    context.push(
      creditContext?.name || typeof data.creditName === 'string'
        ? `Crédito: ${creditContext?.name ?? data.creditName}`
        : `Crédito #${relatedId}`,
    );
  if (
    code === 'HIGH_INTEREST' &&
    typeof data.annualEffectiveRatePercent === 'number' &&
    Number.isFinite(data.annualEffectiveRatePercent)
  )
    context.push(`Tasa EA ${data.annualEffectiveRatePercent}%`);
  if (
    code === 'HIGH_INTEREST' &&
    currency &&
    typeof data.realInterest === 'number' &&
    Number.isFinite(data.realInterest) &&
    typeof data.plannedInterest === 'number' &&
    Number.isFinite(data.plannedInterest)
  ) {
    context.push(`Intereses pagados: ${money(data.realInterest)}`);
    context.push(`Estimación del plan: ${money(data.plannedInterest)}`);
  }
  if (
    code === 'SPEND_SPIKE' &&
    typeof data.differencePercent === 'number' &&
    Number.isFinite(data.differencePercent)
  )
    context.push(
      `Variación mensual ${data.differencePercent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`,
    );
  if (budget && money(data.spentAmount) && money(data.limitAmount))
    context.push(`Gastado: ${money(data.spentAmount)}`, `Límite: ${money(data.limitAmount)}`);
  if (code === 'SPEND_SPIKE' && money(data.currentExpense) && money(data.previousExpense))
    context.push(
      `Este mes: ${money(data.currentExpense)}`,
      `Mes anterior completo: ${money(data.previousExpense)}`,
      'El mes actual puede estar en curso. La comparación usa los gastos registrados de cada mes.',
    );
  if (
    code === 'CREDIT_BEHIND' &&
    typeof data.pendingAmount === 'number' &&
    data.pendingAmount > 0 &&
    money(data.pendingAmount)
  )
    context.push(
      `Cuotas pendientes estimadas: ${money(data.pendingAmount)}`,
      'No es el capital pendiente ni incluye posibles cargos de mora.',
    );
  const seen: SeenAlert | undefined =
    code === 'SPEND_SPIKE'
      ? { code, data: {} }
      : (budget || credit) && relatedId
        ? { code, data: { relatedId } }
        : undefined;
  const target =
    code === 'RECURRING_PENDING'
      ? { kind: 'recurrence' as const }
      : credit && relatedId
        ? { kind: 'credit' as const, id: relatedId }
        : budget && relatedId && period
          ? { kind: 'budget' as const, id: relatedId, ...period }
          : code === 'SPEND_SPIKE' && period && currency
            ? { kind: 'reports' as const, ...period, currency }
            : undefined;
  // Render allowlisted fields and privacy-formatted amounts, never raw backend prose.
  return {
    ...definition,
    context,
    seen,
    target,
    key: String(alert.id ?? `${code}:${relatedId ?? 'global'}:${year}:${month}:${currency}`),
  };
}
export function actionableAlerts(alerts: Alert[]) {
  return alerts.filter(
    (alert) => Boolean(alert.code) && alert.code !== 'ALL_GOOD' && (!alert.state || alert.state === 'ACTIVE'),
  );
}
