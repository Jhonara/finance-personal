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
  type SavingGoal,
  type Credit,
  type CreditPayment,
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
export const useSavings = () =>
  useQuery({ queryKey: secondaryKeys.savings, queryFn: getSavingGoals, staleTime: 60_000 });
export const useSavingProgress = (id: number, enabled = true) =>
  useQuery({
    queryKey: secondaryKeys.savingProgress(id),
    queryFn: () => getSavingProgress(id),
    enabled: enabled && Number.isSafeInteger(id) && id > 0,
    staleTime: 60_000,
  });
export const useCredits = () =>
  useQuery({ queryKey: secondaryKeys.credits, queryFn: getCredits, staleTime: 60_000 });
export const useCredit = (id: number) =>
  useQuery({
    queryKey: secondaryKeys.credit(id),
    queryFn: () => getCredit(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    staleTime: 60_000,
  });
export const usePlanVsReal = (id: number) =>
  useQuery({
    queryKey: secondaryKeys.plan(id),
    queryFn: () => getCreditPlanVsReal(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    staleTime: 60_000,
  });
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
export const useSeenAlert = (afterSuccess?: () => Promise<void>) => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: markAlertSeen,
    retry: false,
    onSuccess: async () => {
      await afterSuccess?.();
      await invalidate(c, [secondaryKeys.alerts]);
    },
  });
};
export const useCreateSaving = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: createSavingGoal,
    retry: false,
    onSuccess: async (goal) => {
      c.setQueryData<SavingGoal[]>(secondaryKeys.savings, (current) =>
        current ? [...current.filter((item) => item.id !== goal.id), goal] : undefined,
      );
      await Promise.all([
        c.invalidateQueries({ queryKey: secondaryKeys.savings, exact: true }),
        c.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
};
export const useContributeSaving = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof addSavingContribution>[1] }) =>
      addSavingContribution(id, data),
    retry: false,
    onSuccess: async (goal, variables) => {
      c.setQueryData<SavingGoal[]>(secondaryKeys.savings, (current) =>
        current?.map((item) => (item.id === variables.id ? goal : item)),
      );
      if (typeof goal.progress === 'number')
        c.setQueryData(secondaryKeys.savingProgress(variables.id), goal.progress);
      await Promise.all([
        c.invalidateQueries({ queryKey: secondaryKeys.savings, exact: true }),
        c.invalidateQueries({ queryKey: secondaryKeys.savingProgress(variables.id), exact: true }),
        c.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    },
  });
};
export const useCreateCredit = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: createCredit,
    retry: false,
    onSuccess: (credit) => {
      if (credit.id !== undefined) c.setQueryData(secondaryKeys.credit(credit.id), credit);
      c.setQueryData<Credit[]>(secondaryKeys.credits, (current) =>
        current ? [...current.filter((item) => item.id !== credit.id), credit] : undefined,
      );
      return refreshCredit(c, credit.id);
    },
  });
};
export const usePayCredit = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof payCredit>[1] }) => payCredit(id, data),
    retry: false,
    onSuccess: (payment, variables) => {
      applyCreditPayment(c, variables.id, payment);
      return refreshCredit(c, variables.id);
    },
  });
};
export const useReverseCreditPayment = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ creditId, paymentId }: { creditId: number; paymentId: number }) =>
      reverseCreditPayment(creditId, paymentId),
    retry: false,
    onSuccess: (payment, variables) => {
      applyCreditPayment(c, variables.creditId, payment);
      return refreshCredit(c, variables.creditId);
    },
  });
};
export const useSimulateCredit = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof simulateCredit>[1] }) =>
      simulateCredit(id, data),
    retry: false,
  });

function applyCreditPayment(client: ReturnType<typeof useQueryClient>, id: number, payment: CreditPayment) {
  const update = (credit: Credit): Credit => ({
    ...credit,
    ...(payment.newBalance === undefined ? {} : { remainingBalance: payment.newBalance }),
    ...(payment.status === undefined ? {} : { status: payment.status }),
    nextPaymentDate: payment.nextPaymentDate,
    // A payment response has no updated totals, installment estimate or version.
    // Do not keep showing those pre-operation figures if the following GET fails.
    paidPrincipal: undefined,
    paidInterest: undefined,
    expectedPaymentAmount: undefined,
    version: undefined,
  });
  client.setQueryData<Credit>(secondaryKeys.credit(id), (current) => (current ? update(current) : current));
  client.setQueryData<Credit[]>(secondaryKeys.credits, (current) =>
    current?.map((credit) => (credit.id === id ? update(credit) : credit)),
  );
}

export const refreshCredit = (client: ReturnType<typeof useQueryClient>, id?: number) =>
  Promise.all([
    client.invalidateQueries({ queryKey: secondaryKeys.credits, exact: true }),
    ...(id === undefined
      ? []
      : [
          client.invalidateQueries({ queryKey: secondaryKeys.credit(id), exact: true }),
          client.invalidateQueries({ queryKey: secondaryKeys.plan(id), exact: true }),
        ]),
    ...[accountKeys.all, dashboardKeys.all, transactionKeys.all, secondaryKeys.alerts].map((queryKey) =>
      client.invalidateQueries({ queryKey }),
    ),
  ]);
