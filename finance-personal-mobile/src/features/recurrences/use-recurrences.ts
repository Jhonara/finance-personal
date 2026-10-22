import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmRecurringEntry,
  getRecurringAgenda,
  getRecurringRules,
  saveRecurringRule,
  setRecurringActive,
  skipRecurringEntry,
} from './recurrence-api';

export const recurrenceKeys = { all: ['recurrences'] as const, rules: ['recurrences', 'rules'] as const };
export const useRecurringRules = () =>
  useQuery({ queryKey: recurrenceKeys.rules, queryFn: getRecurringRules, staleTime: 15_000 });
export const useRecurringAgenda = (year: number, month: number) =>
  useQuery({
    queryKey: [...recurrenceKeys.all, 'agenda', year, month],
    queryFn: () => getRecurringAgenda(year, month),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
export function useRecurringActions() {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all(
      [
        'recurrences',
        'accounts',
        'dashboard',
        'transactions',
        'reports',
        'budgets',
        'alerts',
        'incomes',
        'expenses',
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  };
  return {
    save: useMutation({ mutationFn: saveRecurringRule, retry: false, onSuccess: refresh }),
    active: useMutation({ mutationFn: setRecurringActive, retry: false, onSuccess: refresh }),
    confirm: useMutation({ mutationFn: confirmRecurringEntry, retry: false, onSuccess: refresh }),
    skip: useMutation({ mutationFn: skipRecurringEntry, retry: false, onSuccess: refresh }),
  };
}
