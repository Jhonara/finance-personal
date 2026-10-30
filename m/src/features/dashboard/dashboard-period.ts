export type DashboardPeriod = { year: number; month: number };

export function dashboardPeriodFromParams(year: unknown, month: unknown): DashboardPeriod | undefined {
  if (
    typeof year !== 'string' ||
    typeof month !== 'string' ||
    !/^\d{4}$/.test(year) ||
    !/^\d{1,2}$/.test(month)
  )
    return undefined;
  const y = Number(year),
    m = Number(month);
  return y >= 1900 && y <= 9999 && m >= 1 && m <= 12 ? { year: y, month: m } : undefined;
}

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
