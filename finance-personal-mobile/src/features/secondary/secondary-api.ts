import type { components, operations } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';

type ApiBudget = components['schemas']['BudgetResponse'];
export type Budget = ApiBudget & {
  active?: boolean;
  parentCategoryId?: number | null;
  parentCategoryName?: string | null;
};
export type SavingGoal = Omit<components['schemas']['SavingGoalResponse'], 'currency' | 'status'> & {
  currency?: string | null;
  description?: string | null;
  targetDate?: string | null;
  status?: string;
  version?: number;
};
export type Credit = components['schemas']['CreditResponse'];
export type Alert = components['schemas']['AlertResponse'];
export type CreditPayment = components['schemas']['CreditPaymentResponse'];

export const getBudgets = async (year: number, month: number, includeInactive = false) =>
  (
    await api.get<Budget[]>('/budgets', {
      params: { year, month, ...(includeInactive ? { includeInactive: true } : {}) },
    })
  ).data;
export const createBudget = async (data: components['schemas']['CreateBudgetRequest']) =>
  (await api.post<Budget>('/budgets', data)).data;
export const updateBudget = async (id: number, data: components['schemas']['UpdateBudgetRequest']) =>
  (await api.patch<Budget>(`/budgets/${id}`, data)).data;
export const getAlerts = async () => (await api.get<Alert[]>('/alerts')).data;
export const getAlertHistory = async () => (await api.get<Alert[]>('/alerts/history')).data;
export const updateAlert = async ({
  id,
  ...data
}: components['schemas']['UpdateAlertRequest'] & { id: number }) =>
  (await api.post<Alert>(`/alerts/${id}/state`, data)).data;
export type SeenAlert = { code: string; data: components['schemas']['MarkAlertSeenRequest'] };
export const markAlertSeen = async ({ code, data }: SeenAlert) => {
  await api.post(`/alerts/${encodeURIComponent(code)}/seen`, data);
};
export const getSavingGoals = async () => (await api.get<SavingGoal[]>('/savings/goals')).data;
export const getSavingProgress = async (id: number) =>
  (
    await api.get<operations['progress']['responses'][200]['content']['application/json']>(
      `/savings/goals/${id}/progress`,
    )
  ).data;
export const createSavingGoal = async (
  data: components['schemas']['CreateSavingGoalRequest'] & { description?: string; targetDate?: string },
) => (await api.post<SavingGoal>('/savings/goals', data)).data;
export const assignSavingCurrency = async (id: number, currency: string) =>
  (
    await api.patch<SavingGoal>(`/savings/goals/${id}/currency`, {
      currency,
    } satisfies components['schemas']['AssignSavingCurrencyRequest'])
  ).data;
export const addSavingContribution = async (
  id: number,
  data: components['schemas']['AddSavingMovementRequest'] & { version?: number; requestId?: string },
) => (await api.post<SavingGoal>(`/savings/goals/${id}/movements`, data)).data;
export type SavingMovement = {
  id?: number;
  type?: 'CONTRIBUTION' | 'WITHDRAWAL';
  amount?: number;
  movementDate?: string;
  description?: string;
};
export const getSavingMovements = async (id: number) =>
  (await api.get<SavingMovement[]>(`/savings/goals/${id}/movements`)).data;
export const updateSavingGoal = async (
  id: number,
  data: { name: string; description?: string; targetAmount: number; targetDate?: string; version: number },
) => (await api.put<SavingGoal>(`/savings/goals/${id}`, data)).data;
export const setSavingStatus = async (
  id: number,
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED',
  version: number,
) => (await api.patch<SavingGoal>(`/savings/goals/${id}/status`, { status, version })).data;
export const deleteSavingGoal = async (id: number, version: number) => {
  await api.delete(`/savings/goals/${id}`, { params: { version } });
};
export const withdrawSaving = async (id: number, data: Parameters<typeof addSavingContribution>[1]) =>
  (await api.post<SavingGoal>(`/savings/goals/${id}/withdrawals`, data)).data;
export const getCredits = async () => (await api.get<Credit[]>('/credits')).data;
export const getCredit = async (id: number) => (await api.get<Credit>(`/credits/${id}`)).data;
export const createCredit = async (data: components['schemas']['CreateCreditRequest']) =>
  (await api.post<Credit>('/credits', data)).data;
export const updateCredit = async (id: number, data: components['schemas']['UpdateCreditRequest']) =>
  (await api.put<Credit>(`/credits/${id}`, data)).data;
export type CreditOpeningPosition = components['schemas']['SetCreditOpeningRequest'];
export const setCreditOpeningPosition = async (id: number, data: CreditOpeningPosition) =>
  (await api.put<Credit>(`/credits/${id}/opening-position`, data)).data;
export const deleteCredit = async (id: number) => {
  await api.delete(`/credits/${id}`);
};
export const payCredit = async (id: number, data: components['schemas']['CreateCreditPaymentRequest']) =>
  (await api.post<CreditPayment>(`/credits/${id}/payments`, data)).data;
export const reverseCreditPayment = async (creditId: number, paymentId: number) =>
  (await api.post<CreditPayment>(`/credits/${creditId}/payments/${paymentId}/reverse`)).data;
export type CreditPlan = components['schemas']['CreditPlanVsRealResponse'];
export type CreditSimulation = components['schemas']['CreditSimulationResponse'];
export const getCreditPlanVsReal = async (id: number) =>
  (await api.get<CreditPlan>(`/credits/${id}/plan-vs-real`)).data;
export const simulateCredit = async (id: number, data: components['schemas']['CreditSimulationRequest']) =>
  (await api.post<CreditSimulation>(`/credits/${id}/simulate`, data)).data;

export const deactivateBudget = async (id: number, version: number) => {
  await api.delete(`/budgets/${id}`, { params: { version } });
};
export const restoreBudget = async (id: number, version: number) =>
  (await api.patch<Budget>(`/budgets/${id}/state`, { active: true, version })).data;
