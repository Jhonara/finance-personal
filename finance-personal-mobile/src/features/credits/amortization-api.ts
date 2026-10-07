import type { components } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';

// Java records always emit these values. OpenAPI marks response properties as
// optional, so narrow the generated contract at the read boundary.
export type AmortizationRow = components['schemas']['AmortizationRow'];
type Complete<T> = { [K in keyof T]-?: NonNullable<T[K]> };

export type RecordedCreditPayment = Complete<components['schemas']['CreditAmortizationPaymentRow']>;

export type CreditAmortization = Complete<
  Omit<
    components['schemas']['CreditAmortizationResponse'],
    | 'payments'
    | 'originalSchedule'
    | 'projectedSchedule'
    | 'projectedPayoffDate'
    | 'projectionWarning'
    | 'installmentsSavedByRecordedExtras'
    | 'interestSavedByRecordedExtras'
  >
> & {
  payments: RecordedCreditPayment[];
  originalSchedule: AmortizationRow[];
  projectedSchedule: AmortizationRow[];
  projectedPayoffDate: string | null;
  projectionWarning: string | null;
  installmentsSavedByRecordedExtras: number | null;
  interestSavedByRecordedExtras: number | null;
};

export type CreditAmortizationScenario = Complete<
  Omit<
    components['schemas']['CreditAmortizationScenarioResponse'],
    'baselinePayoffDate' | 'scenarioPayoffDate' | 'schedule'
  >
> & {
  baselinePayoffDate: string | null;
  scenarioPayoffDate: string | null;
  schedule: AmortizationRow[];
};

export type CreditAmortizationScenarioInput = components['schemas']['CreditAmortizationScenarioRequest'];

export const getCreditAmortization = async (id: number) =>
  (await api.get<CreditAmortization>(`/credits/${id}/amortization`)).data;

export const simulateCreditAmortization = async (id: number, data: CreditAmortizationScenarioInput) =>
  (await api.post<CreditAmortizationScenario>(`/credits/${id}/amortization/scenarios`, data)).data;
