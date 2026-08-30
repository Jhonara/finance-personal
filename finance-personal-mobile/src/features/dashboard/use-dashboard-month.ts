import { useQuery } from '@tanstack/react-query';

import { getDashboardMonth, type DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from './dashboard-period';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  month: (period: DashboardPeriod) => [...dashboardKeys.all, period.year, period.month] as const,
};
export function useDashboardMonth(period: DashboardPeriod) {
  return useQuery<DashboardMonth>({
    queryKey: dashboardKeys.month(period),
    queryFn: () => getDashboardMonth(period.year, period.month),
    staleTime: 60_000,
  });
}
