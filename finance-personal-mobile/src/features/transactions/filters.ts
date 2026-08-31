import type { operations } from '@/api/generated/schema';

type TransactionQuery = NonNullable<operations['list_4']['parameters']['query']>;

export type TransactionFilters = Omit<TransactionQuery, 'page' | 'size'>;
export type TransactionType = NonNullable<TransactionFilters['type']>;
export type TransactionStatus = NonNullable<TransactionFilters['status']>;
export type PeriodMode = 'month' | 'range';

export const transactionTypeLabels: Record<TransactionType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  OPENING_BALANCE: 'Saldo inicial',
  REVERSAL: 'Reversión',
  CREDIT_DISBURSEMENT: 'Desembolso de crédito',
  CREDIT_PAYMENT: 'Pago de crédito',
};

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  POSTED: 'Registrado',
  REVERSED: 'Revertido',
  VOIDED: 'Anulado',
};

export function normalizeTransactionFilters(filters: TransactionFilters): TransactionFilters {
  const result: TransactionFilters = {};
  if (filters.from || filters.to) {
    if (filters.from) result.from = filters.from;
    if (filters.to) result.to = filters.to;
  } else {
    if (filters.year !== undefined) result.year = filters.year;
    if (filters.month !== undefined) result.month = filters.month;
  }
  if (filters.accountId !== undefined) result.accountId = filters.accountId;
  if (filters.categoryId !== undefined) result.categoryId = filters.categoryId;
  if (filters.type) result.type = filters.type;
  if (filters.status) result.status = filters.status;
  return result;
}

export function filterCount(filters: TransactionFilters): number {
  return Object.keys(normalizeTransactionFilters(filters)).length;
}

export function validateTransactionFilters(filters: TransactionFilters): string | undefined {
  if (filters.from && filters.to && filters.from > filters.to)
    return 'La fecha inicial no puede ser posterior a la final.';
  if ((filters.year === undefined) !== (filters.month === undefined)) return 'Selecciona el año y el mes.';
  return undefined;
}
