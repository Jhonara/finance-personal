import type { Transaction } from './transactions-api';

export type PresentedTransaction = Transaction & {
  title: string;
  subtitle: string;
  typeLabel: string;
  statusLabel: string;
  amountPrefix: '' | '+' | '-';
};

const typeLabels: Record<string, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
  OPENING_BALANCE: 'Saldo inicial',
  REVERSAL: 'Reversión',
  CREDIT_DISBURSEMENT: 'Desembolso de crédito',
  CREDIT_PAYMENT: 'Pago de crédito',
};
const statusLabels: Record<string, string> = {
  POSTED: 'Registrado',
  REVERSED: 'Revertido',
  VOIDED: 'Anulado',
};

export function presentTransaction(transaction: Transaction): PresentedTransaction {
  const type = transaction.type ?? 'REVERSAL';
  const typeLabel = typeLabels[type] ?? 'Movimiento';
  const title = transactionTitle(transaction, type);
  const subtitle = transactionSubtitle(transaction, type, typeLabel);
  return {
    ...transaction,
    title,
    subtitle,
    typeLabel,
    statusLabel: statusLabels[transaction.status ?? 'POSTED'] ?? 'Registrado',
    amountPrefix:
      type === 'INCOME' || type === 'CREDIT_DISBURSEMENT'
        ? '+'
        : type === 'EXPENSE' || type === 'CREDIT_PAYMENT'
          ? '-'
          : '',
  };
}

function transactionTitle(transaction: Transaction, type: string): string {
  const description = transaction.description?.trim();
  const category = transaction.categoryName?.trim();
  if (type === 'TRANSFER')
    return transaction.destinationAccountName
      ? `Transferencia a ${transaction.destinationAccountName}`
      : 'Transferencia';
  if (type === 'OPENING_BALANCE') return 'Saldo inicial';
  if (type === 'REVERSAL') return 'Reversión';
  if (type === 'CREDIT_DISBURSEMENT') return 'Desembolso de crédito';
  if (type === 'CREDIT_PAYMENT') return 'Pago de crédito';
  return description || category || (type === 'INCOME' ? 'Ingreso' : 'Gasto');
}

function transactionSubtitle(transaction: Transaction, type: string, typeLabel: string): string {
  if (type === 'TRANSFER') {
    const route = [transaction.sourceAccountName, transaction.destinationAccountName]
      .filter(Boolean)
      .join(' → ');
    return route ? `${typeLabel} · ${route}` : typeLabel;
  }
  const details = [typeLabel, transaction.categoryName, transaction.accountName].filter(Boolean);
  return details.join(' · ') || typeLabel;
}
