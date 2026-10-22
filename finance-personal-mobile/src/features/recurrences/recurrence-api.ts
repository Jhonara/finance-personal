import { api } from '@/auth/auth-provider';
import type { components } from '@/api/generated/schema';

type NullableFields<T, K extends keyof T> = Omit<Required<T>, K> & { [P in K]-?: NonNullable<T[P]> | null };
export type SaveRecurringRule = components['schemas']['SaveRecurringRuleRequest'];
export type Frequency = SaveRecurringRule['frequency'];
export type RecurringKind = SaveRecurringRule['kind'];
export type RecurringMode = SaveRecurringRule['mode'];
export type RecurringRule = NullableFields<
  components['schemas']['RecurringRuleResponse'],
  'categoryId' | 'endDate' | 'secondDay'
>;
export type RecurringEntry = Omit<
  NullableFields<
    components['schemas']['RecurringEntryResponse'],
    'id' | 'issue' | 'transactionId' | 'recordedDate'
  >,
  'status'
> & {
  status: 'PLANNED' | 'PENDING' | 'POSTED' | 'SKIPPED' | 'REVERSED';
};
export const getRecurringRules = async () => (await api.get<RecurringRule[]>('/recurrences')).data;
export const getRecurringAgenda = async (year: number, month: number) =>
  (await api.get<{ entries: RecurringEntry[] }>('/recurrences/agenda', { params: { year, month } })).data;
export const saveRecurringRule = async ({ id, data }: { id?: number; data: SaveRecurringRule }) =>
  (id
    ? await api.put<RecurringRule>(`/recurrences/${id}`, data)
    : await api.post<RecurringRule>('/recurrences', data)
  ).data;
export const setRecurringActive = async ({
  id,
  active,
  version,
}: {
  id: number;
  active: boolean;
  version: number;
}) => (await api.patch<RecurringRule>(`/recurrences/${id}/active`, { active, version })).data;
export const confirmRecurringEntry = async ({
  entry,
  amount,
  date,
}: {
  entry: RecurringEntry;
  amount: number;
  date: string;
}) =>
  (
    await api.post<RecurringEntry>(`/recurrences/${entry.ruleId}/occurrences/${entry.dueDate}/confirm`, {
      amount,
      date,
    })
  ).data;
export const skipRecurringEntry = async (entry: RecurringEntry) =>
  (await api.post<RecurringEntry>(`/recurrences/${entry.ruleId}/occurrences/${entry.dueDate}/skip`)).data;
