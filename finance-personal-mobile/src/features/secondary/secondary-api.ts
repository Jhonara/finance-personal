import type { components } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';

export type Budget = components['schemas']['BudgetResponse'];
export type SavingGoal = components['schemas']['SavingGoalResponse'];
export type Credit = components['schemas']['CreditResponse'];
export type Alert = components['schemas']['AlertResponse'];
export type CreditPayment = components['schemas']['CreditPaymentResponse'];

export const getBudgets = async (year: number, month: number) =>
  (await api.get<Budget[]>('/budgets', { params: { year, month } })).data;
export const createBudget = async (data: components['schemas']['CreateBudgetRequest']) =>
  (await api.post<Budget>('/budgets', data)).data;
export const updateBudget = async (id: number, data: components['schemas']['UpdateBudgetRequest']) =>
  (await api.patch<Budget>(`/budgets/${id}`, data)).data;
export const getAlerts = async () => (await api.get<Alert[]>('/alerts')).data;
export const markAlertSeen = async (code: string) => {
  await api.post(`/alerts/${code}/seen`);
};
export const getSavingGoals = async () => (await api.get<SavingGoal[]>('/savings/goals')).data;
export const getSavingProgress = async (id: number) =>
  (await api.get<components['schemas']['SavingProgressResponse']>(`/savings/goals/${id}/progress`)).data;
export const createSavingGoal = async (data: components['schemas']['CreateSavingGoalRequest']) =>
  (await api.post<SavingGoal>('/savings/goals', data)).data;
export const addSavingContribution = async (
  id: number,
  data: components['schemas']['AddSavingMovementRequest'],
) => (await api.post<SavingGoal>(`/savings/goals/${id}/movements`, data)).data;
export const getCredits = async () => (await api.get<Credit[]>('/credits')).data;
export const getCredit = async (id: number) => (await api.get<Credit>(`/credits/${id}`)).data;
export const createCredit = async (data: components['schemas']['CreateCreditRequest']) =>
  (await api.post<Credit>('/credits', data)).data;
export const payCredit = async (id: number, data: components['schemas']['CreateCreditPaymentRequest']) =>
  (await api.post<CreditPayment>(`/credits/${id}/payments`, data)).data;
export const reverseCreditPayment = async (creditId: number, paymentId: number) =>
  (await api.post<CreditPayment>(`/credits/${creditId}/payments/${paymentId}/reverse`)).data;
export const getCreditPlanVsReal = async (id: number) => (await api.get(`/credits/${id}/plan-vs-real`)).data;
export const simulateCredit = async (id: number, data: components['schemas']['CreditSimulationRequest']) =>
  (await api.post(`/credits/${id}/simulate`, data)).data;
