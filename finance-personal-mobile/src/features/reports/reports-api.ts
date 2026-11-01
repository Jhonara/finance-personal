import { api } from '@/auth/auth-provider';
import type { operations } from '@/api/generated/schema';
import type { ReportMonth } from './report-model';
import type { TransactionPage } from '@/features/transactions/transactions-api';

export type ReportCategoryType = 'EXPENSE' | 'INCOME';
export type CategoryReportItem = { categoryId: number; categoryName: string; amount: number };
export type CategoryReportGroup = {
  categoryId: number | null;
  categoryName: string;
  amount: number;
  directAmount: number;
  subcategories: CategoryReportItem[];
};
export type CategoryReport = {
  year: number;
  month: number;
  currency: string;
  type: ReportCategoryType;
  totalAmount: number;
  groups: CategoryReportGroup[];
};
export type BudgetComparisonItem = {
  categoryId: number;
  categoryName: string;
  limitAmount: number;
  spentAmount: number;
  differenceAmount: number;
  percentageUsed?: number | null;
  remainingAmount: number;
  excessAmount: number;
  hasBudget: boolean;
  coveredByParentBudget: boolean;
};
export type BudgetComparisonGroup = {
  categoryId: number;
  categoryName: string;
  limitAmount: number;
  spentAmount: number;
  budgetedSpentAmount: number;
  differenceAmount: number;
  percentageUsed?: number | null;
  remainingAmount: number;
  excessAmount: number;
  hasBudget: boolean;
  hasParentBudget: boolean;
  directSpentAmount: number;
  subcategories: BudgetComparisonItem[];
};
export type UnbudgetedCategoryAmount = {
  categoryId: number | null;
  categoryName: string;
  parentCategoryName?: string | null;
  spentAmount: number;
};
export type BudgetComparison = {
  year: number;
  month: number;
  currency: string;
  totalBudgetedAmount: number;
  totalSpentAmount: number;
  totalSpentOnBudgetedCategories: number;
  totalUnbudgetedAmount: number;
  groups: BudgetComparisonGroup[];
  unbudgetedCategories: UnbudgetedCategoryAmount[];
};

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

export const getCategoryReport = async (
  year: number,
  month: number,
  currency: string,
  type: ReportCategoryType,
) => (await api.get<CategoryReport>('/reports/categories', { params: { year, month, currency, type } })).data;

export const getCategoryTransactions = async (
  categoryId: number | null,
  year: number,
  month: number,
  currency: string,
  type: ReportCategoryType,
  page: number,
) =>
  (
    await api.get<TransactionPage>(`/reports/categories/${categoryId ?? 'uncategorized'}/transactions`, {
      params: { year, month, currency, type, page, size: 20 },
    })
  ).data;

export const getBudgetVsActual = async (year: number, month: number) =>
  (await api.get<BudgetComparison>('/reports/budget-vs-actual', { params: { year, month } })).data;

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
