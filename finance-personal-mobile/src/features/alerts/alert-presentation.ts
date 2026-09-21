import type { Alert, SeenAlert } from '@/features/secondary/secondary-api';

export const alertLevels = ['Importante', 'Atención', 'Información'] as const;
export type AlertLevel = (typeof alertLevels)[number];
const definitions: Record<string, { title: string; description: string; level: AlertLevel }> = {
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
    description: 'Los pagos registrados van por detrás del plan del crédito.',
    level: 'Importante',
  },
  HIGH_INTEREST: {
    title: 'Intereses por encima del plan',
    description: 'Los intereses pagados superan lo esperado en el plan de este crédito.',
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
export function presentAlert(alert: Alert) {
  const code = alert.code ?? '';
  const definition = definitions[code] ?? {
    title: 'Aviso financiero',
    description: 'Revisa tu información financiera.',
    level: 'Información' as const,
  };
  const data = alert.data ?? {};
  const budget = code === 'BUDGET_WARNING' || code === 'BUDGET_EXCEEDED';
  const credit = ['CREDIT_BEHIND', 'HIGH_INTEREST', 'OPPORTUNITY_PREPAY'].includes(code);
  const relatedId = positiveId(budget ? data.budgetId : credit ? data.creditId : undefined);
  const year = positiveId(data.year);
  const month = positiveId(data.month);
  const period = year && year <= 9999 && month && month <= 12 ? { year, month } : undefined;
  const context: string[] = [];
  if (budget && typeof data.categoryName === 'string' && data.categoryName.trim())
    context.push(`Categoría ${data.categoryName}`);
  if (budget && period) context.push(`Período ${period.year}-${String(period.month).padStart(2, '0')}`);
  if (credit && relatedId) context.push(`Crédito #${relatedId}`);
  if (
    code === 'HIGH_INTEREST' &&
    typeof data.annualEffectiveRatePercent === 'number' &&
    Number.isFinite(data.annualEffectiveRatePercent)
  )
    context.push(`Tasa EA ${data.annualEffectiveRatePercent}%`);
  if (
    code === 'SPEND_SPIKE' &&
    typeof data.differencePercent === 'number' &&
    Number.isFinite(data.differencePercent)
  )
    context.push(`Variación mensual ${data.differencePercent}%`);
  const seen: SeenAlert | undefined =
    code === 'SPEND_SPIKE'
      ? { code, data: {} }
      : (budget || credit) && relatedId
        ? { code, data: { relatedId } }
        : undefined;
  const target =
    credit && relatedId
      ? { kind: 'credit' as const, id: relatedId }
      : budget && relatedId && period
        ? { kind: 'budget' as const, id: relatedId, ...period }
        : undefined;
  // Only allowlisted non-monetary context is rendered. Backend messages can contain amounts.
  return { ...definition, context, seen, target, key: `${code}:${relatedId ?? 'global'}` };
}
export function actionableAlerts(alerts: Alert[]) {
  return alerts.filter((alert) => alert.code !== 'ALL_GOOD');
}
