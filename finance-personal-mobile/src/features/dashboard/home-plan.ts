import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from './dashboard-period';
import { actionableAlerts, presentAlert } from '@/features/alerts/alert-presentation';
import { financialProgress } from '@/features/progress/financial-progress';

export function homeColumns(width: number, fontScale: number): 1 | 2 {
  return width / fontScale < 280 ? 1 : 2;
}

// Presentation only. Unknown fields remain unknown; no requests or inferred balances.
export function homePlan(data: DashboardMonth, period: DashboardPeriod) {
  const items = data.budgets?.items ?? [];
  const monthly = items.every(
    (b) =>
      (b.year === undefined || b.year === period.year) && (b.month === undefined || b.month === period.month),
  );
  const used = data.budgets?.overallPercentage;
  const saving = financialProgress({ dashboard: data, period }).find((s) => s.kind === 'savings');
  const budgetPercent =
    monthly && items.length && typeof used === 'number' && Number.isFinite(used) && used >= 0
      ? used
      : undefined;
  const active = data.credits?.filter((c) => c.status === 'ACTIVE' || c.status === 'LATE').length;
  const paid = data.credits?.filter((c) => c.status === 'PAID').length;
  const alerts = data.alerts && actionableAlerts(data.alerts);
  const snoozed = data.alerts?.filter((alert) => alert.state === 'SNOOZED').length ?? 0;
  const clear = data.alerts !== undefined && data.alerts.every((a) => Boolean(a.code));
  return {
    budget:
      budgetPercent !== undefined
        ? `${budgetPercent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% utilizado`
        : 'Ver tus límites',
    budgetPercent,
    saving: saving?.title.replace(/ está al (?=[\d.,]+%$)/, ' · ') ?? 'Ver tus metas',
    savingPercent: saving?.percentage,
    credit: active
      ? `${active} ${active === 1 ? 'activo' : 'activos'}`
      : paid
        ? `${paid} ${paid === 1 ? 'pagado' : 'pagados'}`
        : 'Ver tus créditos',
    alerts: alerts?.length
      ? `${alerts.length} por revisar`
      : snoozed
        ? `${snoozed} pospuestas`
        : clear
          ? 'Sin avisos'
          : 'Ver tus alertas',
    alertState: alerts?.length
      ? alerts.some((alert) => presentAlert(alert).level === 'Importante')
        ? ('important' as const)
        : ('attention' as const)
      : clear
        ? ('clear' as const)
        : ('unknown' as const),
  };
}
