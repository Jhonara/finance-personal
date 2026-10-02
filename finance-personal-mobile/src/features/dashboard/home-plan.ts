import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from './dashboard-period';
import { presentAlert } from '@/features/alerts/alert-presentation';
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
  const active = data.credits?.filter((c) => c.status === 'ACTIVE' || c.status === 'LATE').length;
  const paid = data.credits?.filter((c) => c.status === 'PAID').length;
  const alerts = data.alerts?.filter((a) => a.code && a.code !== 'ALL_GOOD');
  const clear = data.alerts !== undefined && data.alerts.every((a) => Boolean(a.code));
  return {
    budget:
      monthly && items.length && typeof used === 'number' && Number.isFinite(used) && used >= 0
        ? `${used.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% utilizado`
        : 'Ver tus límites',
    saving: saving?.title.replace(/ está al (?=[\d.,]+%$)/, ' · ') ?? 'Ver tus metas',
    credit: active
      ? `${active} ${active === 1 ? 'activo' : 'activos'}`
      : paid
        ? `${paid} ${paid === 1 ? 'pagado' : 'pagados'}`
        : 'Ver tus créditos',
    alerts: alerts?.length ? `${alerts.length} por revisar` : clear ? 'Todo bien' : 'Ver tus alertas',
    alertState: alerts?.length
      ? alerts.some((alert) => presentAlert(alert).level === 'Importante')
        ? ('important' as const)
        : ('attention' as const)
      : clear
        ? ('clear' as const)
        : ('unknown' as const),
  };
}
