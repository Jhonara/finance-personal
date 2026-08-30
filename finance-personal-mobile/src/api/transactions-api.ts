import { api } from '@/auth/auth-provider';
import type { components } from './generated/schema';

export type TransactionPage = components['schemas']['TransactionPageResponse'];

export async function getTransactions(page = 0, size = 20): Promise<TransactionPage> {
  return (await api.get<TransactionPage>('/transactions', { params: { page, size } })).data;
}
