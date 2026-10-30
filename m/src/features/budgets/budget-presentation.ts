import type { Budget } from '@/features/secondary/secondary-api';

export function budgetOverview(budgets: Budget[]) {
  const limit = budgets.reduce((sum, item) => sum + (item.limitAmount ?? 0), 0);
  const spent = budgets.reduce((sum, item) => sum + (item.spentAmount ?? 0), 0);
  const remaining = budgets.reduce((sum, item) => sum + (item.remainingAmount ?? 0), 0);
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const exceeded = budgets.filter((item) => item.status === 'EXCEEDED').length;
  const warning = budgets.filter((item) => item.status === 'WARNING').length;
  return { limit, spent, remaining, percentage, exceeded, warning };
}

export function budgetMessage(percentage: number, exceeded: number, warning: number) {
  if (exceeded)
    return `${exceeded} ${exceeded === 1 ? 'categoría superó' : 'categorías superaron'} su límite`;
  if (warning)
    return `${warning} ${warning === 1 ? 'categoría se acerca' : 'categorías se acercan'} al límite`;
  if (percentage === 0) return 'Aún no hay gastos en estas categorías';
  return 'Vas dentro de tus límites este mes';
}
