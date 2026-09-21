import { api } from '@/auth/auth-provider';
import type { components } from './generated/schema';

export type DashboardMonth = components['schemas']['DashboardMonthResponse'];

export async function getDashboardMonth(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<DashboardMonth> {
  return (
    await api.get<DashboardMonth>('/dashboard/month', {
      params: { year, month },
      ...(signal ? { signal } : {}),
    })
  ).data;
}
