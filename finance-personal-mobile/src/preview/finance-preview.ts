import type { BudgetVisualStatus, TransactionKind } from '@/ui/presentation';

export const previewAccounts = [
  { name: 'Cuenta principal', typeLabel: 'Cuenta bancaria', currency: 'COP', balance: 8450000, active: true },
  { name: 'Efectivo', typeLabel: 'Efectivo', currency: 'COP', balance: 180000, active: true },
  { name: 'Cuenta anterior', typeLabel: 'Cuenta bancaria', currency: 'COP', balance: 0, active: false },
];
export const previewTransactions: Array<{
  type: TransactionKind;
  title: string;
  subtitle: string;
  amount: number;
}> = [
  { type: 'EXPENSE', title: 'Mercado', subtitle: 'Hoy · Alimentación', amount: -186000 },
  { type: 'TRANSFER', title: 'Ahorro mensual', subtitle: 'Ayer · Cuenta principal', amount: -350000 },
  { type: 'INCOME', title: 'Nómina', subtitle: '28 ago · Trabajo', amount: 4500000 },
];
export const previewBudgets: Array<{
  label: string;
  spent: number;
  limit: number;
  remaining: number;
  percentage: number;
  status: BudgetVisualStatus;
}> = [
  { label: 'Alimentación', spent: 395000, limit: 500000, remaining: 105000, percentage: 79, status: 'OK' },
  { label: 'Transporte', spent: 420000, limit: 500000, remaining: 80000, percentage: 84, status: 'WARNING' },
  {
    label: 'Entretenimiento',
    spent: 180000,
    limit: 150000,
    remaining: -30000,
    percentage: 120,
    status: 'EXCEEDED',
  },
];
