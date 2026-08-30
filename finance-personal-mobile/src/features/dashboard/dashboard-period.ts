export type DashboardPeriod = { year: number; month: number };

export function currentDashboardPeriod(now = new Date()): DashboardPeriod {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
export function shiftDashboardPeriod(period: DashboardPeriod, delta: -1 | 1): DashboardPeriod {
  const value = new Date(period.year, period.month - 1 + delta, 1);
  return { year: value.getFullYear(), month: value.getMonth() + 1 };
}
export function formatDashboardPeriod(period: DashboardPeriod): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
    .format(new Date(period.year, period.month - 1, 1))
    .replace(/^./, (letter) => letter.toUpperCase());
}
