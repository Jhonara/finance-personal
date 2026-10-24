import { api } from '@/auth/auth-provider';
import type { operations } from '@/api/generated/schema';
import type { ReportMonth } from './report-model';
import type { TransactionPage } from '@/features/transactions/transactions-api';

export const getReportExpenses = async (
  year: number,
  month: number,
  currency: string,
  category: string | undefined,
  page: number,
) =>
  (
    await api.get<TransactionPage>('/reports/expenses', {
      params: { year, month, currency, category, page, size: 20 },
    })
  ).data;

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
