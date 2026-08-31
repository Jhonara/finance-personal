import type { components } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';
import type { TransactionFilters } from './filters';

export type TransactionPage = components['schemas']['TransactionPageResponse'];
export type Transaction = components['schemas']['TransactionResponse'];
export const getTransactionPage = async (page: number, filters: TransactionFilters = {}) =>
  (await api.get<TransactionPage>('/transactions', { params: { page, size: 20, ...filters } })).data;
export const createExpense = async (data: components['schemas']['CreateExpenseRequest']) =>
  (await api.post('/expenses', data)).data;
export const createIncome = async (data: components['schemas']['CreateIncomeRequest']) =>
  (await api.post('/incomes', data)).data;
export const createTransfer = async (data: components['schemas']['CreateTransferRequest']) =>
  (await api.post('/transfers', data)).data;
