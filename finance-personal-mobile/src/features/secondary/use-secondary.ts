import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountKeys } from '@/features/accounts/use-accounts';
import { dashboardKeys } from '@/features/dashboard/use-dashboard-month';
import { transactionKeys } from '@/features/transactions/use-transactions';
import {
  addSavingContribution,
  createBudget,
  createCredit,
  createSavingGoal,
  getAlerts,
  getBudgets,
  getCredit,
  getCredits,
  getCreditPlanVsReal,
  getSavingGoals,
  getSavingProgress,
  markAlertSeen,
  payCredit,
  reverseCreditPayment,
  simulateCredit,
  updateBudget,
} from './secondary-api';
export const secondaryKeys = {
  budgets: (year: number, month: number) => ['budgets', year, month] as const,
  alerts: ['alerts'] as const,
  savings: ['savings'] as const,
  savingProgress: (id: number) => ['savings', id, 'progress'] as const,
  credits: ['credits'] as const,
  credit: (id: number) => ['credits', id] as const,
  plan: (id: number) => ['credits', id, 'plan'] as const,
};
const invalidate = (client: ReturnType<typeof useQueryClient>, keys: ReadonlyArray<readonly unknown[]>) =>
  Promise.all([
    ...keys.map((queryKey) => client.invalidateQueries({ queryKey })),
    client.invalidateQueries({ queryKey: dashboardKeys.all }),
  ]);
export const useBudgets = (year: number, month: number) =>
  useQuery({ queryKey: secondaryKeys.budgets(year, month), queryFn: () => getBudgets(year, month) });
export const useAlerts = () => useQuery({ queryKey: secondaryKeys.alerts, queryFn: getAlerts });
export const useSavings = () => useQuery({ queryKey: secondaryKeys.savings, queryFn: getSavingGoals });
export const useSavingProgress = (id: number) =>
  useQuery({ queryKey: secondaryKeys.savingProgress(id), queryFn: () => getSavingProgress(id) });
export const useCredits = () => useQuery({ queryKey: secondaryKeys.credits, queryFn: getCredits });
export const useCredit = (id: number) =>
  useQuery({ queryKey: secondaryKeys.credit(id), queryFn: () => getCredit(id) });
export const usePlanVsReal = (id: number) =>
  useQuery({ queryKey: secondaryKeys.plan(id), queryFn: () => getCreditPlanVsReal(id) });
export const useCreateBudget = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: createBudget,
    retry: false,
    onSuccess: () => invalidate(c, [['budgets'], secondaryKeys.alerts]),
  });
};
export const useUpdateBudget = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateBudget>[1] }) =>
      updateBudget(id, data),
    retry: false,
    onSuccess: () => invalidate(c, [['budgets'], secondaryKeys.alerts]),
  });
};
export const useSeenAlert = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: markAlertSeen,
    retry: false,
    onSuccess: () => invalidate(c, [secondaryKeys.alerts]),
  });
};
export const useCreateSaving = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: createSavingGoal,
    retry: false,
    onSuccess: () => invalidate(c, [secondaryKeys.savings]),
  });
};
export const useContributeSaving = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof addSavingContribution>[1] }) =>
      addSavingContribution(id, data),
    retry: false,
    onSuccess: (_data, variables) =>
      invalidate(c, [secondaryKeys.savings, secondaryKeys.savingProgress(variables.id)]),
  });
};
export const useCreateCredit = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: createCredit,
    retry: false,
    onSuccess: () =>
      invalidate(c, [secondaryKeys.credits, accountKeys.all, transactionKeys.all, secondaryKeys.alerts]),
  });
};
export const usePayCredit = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof payCredit>[1] }) => payCredit(id, data),
    retry: false,
    onSuccess: () =>
      invalidate(c, [secondaryKeys.credits, accountKeys.all, transactionKeys.all, secondaryKeys.alerts]),
  });
};
export const useReverseCreditPayment = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ creditId, paymentId }: { creditId: number; paymentId: number }) =>
      reverseCreditPayment(creditId, paymentId),
    retry: false,
    onSuccess: () =>
      invalidate(c, [secondaryKeys.credits, accountKeys.all, transactionKeys.all, secondaryKeys.alerts]),
  });
};
export const useSimulateCredit = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof simulateCredit>[1] }) =>
      simulateCredit(id, data),
    retry: false,
  });
