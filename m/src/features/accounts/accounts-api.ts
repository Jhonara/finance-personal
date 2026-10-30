import type { components } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';

export type Account = components['schemas']['AccountResponse'];
export type CreateAccount = components['schemas']['CreateAccountRequest'];
export type UpdateAccount = components['schemas']['UpdateAccountRequest'];
export type OpeningBalance = components['schemas']['CreateOpeningBalanceRequest'];
export const getAccounts = async () => (await api.get<Account[]>('/accounts')).data;
export const createAccount = async (data: CreateAccount) => (await api.post<Account>('/accounts', data)).data;
export const updateAccount = async (id: number, data: UpdateAccount) =>
  (await api.patch<Account>(`/accounts/${id}`, data)).data;
export const createOpeningBalance = async (id: number, data: OpeningBalance) =>
  (await api.post(`/accounts/${id}/opening-balance`, data)).data;
