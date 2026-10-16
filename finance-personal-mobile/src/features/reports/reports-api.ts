import { api } from '@/auth/auth-provider';
import type { operations } from '@/api/generated/schema';
import type { ReportMonth } from './report-model';

type ReportResponse = operations['month']['responses'][200]['content']['*/*'];

export const getReportMonth = async (
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<ReportMonth> => {
  const response = (await api.get<ReportResponse>('/reports/month', { params: { year, month }, signal }))
    .data;
  return Object.fromEntries(
    Object.entries(response).map(([currency, entry]) => [
      currency,
      {
        income: entry.income ?? 0,
        expense: entry.expense ?? 0,
        expensesByCategory: entry.expensesByCategory ?? {},
      },
    ]),
  );
};
