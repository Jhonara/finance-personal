export type TransactionKind =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER'
  | 'OPENING_BALANCE'
  | 'REVERSAL'
  | 'CREDIT_DISBURSEMENT'
  | 'CREDIT_PAYMENT';
export type BudgetVisualStatus = 'OK' | 'WARNING' | 'EXCEEDED';

export const transactionPresentation: Record<
  TransactionKind,
  { label: string; icon: string; tone: 'success' | 'danger' | 'info' | 'warning' }
> = {
  INCOME: { label: 'Ingreso', icon: 'arrow-down-outline', tone: 'success' },
  EXPENSE: { label: 'Gasto', icon: 'arrow-up-outline', tone: 'danger' },
  TRANSFER: { label: 'Transferencia', icon: 'swap-horizontal-outline', tone: 'info' },
  OPENING_BALANCE: { label: 'Saldo inicial', icon: 'wallet-outline', tone: 'info' },
  REVERSAL: { label: 'Reversión', icon: 'return-up-back-outline', tone: 'warning' },
  CREDIT_DISBURSEMENT: { label: 'Desembolso de crédito', icon: 'cash-outline', tone: 'info' },
  CREDIT_PAYMENT: { label: 'Pago de crédito', icon: 'card-outline', tone: 'warning' },
};

export const budgetStatusPresentation: Record<
  BudgetVisualStatus,
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  OK: { label: 'En curso', tone: 'success' },
  WARNING: { label: 'Atención', tone: 'warning' },
  EXCEEDED: { label: 'Excedido', tone: 'danger' },
};

export function isButtonDisabled(disabled = false, loading = false): boolean {
  return disabled || loading;
}
export function preserveMoneyInput(value: string): string {
  return value.replace(/[^0-9.,]/g, '');
}
