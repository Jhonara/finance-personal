import type { Budget } from '@/features/secondary/secondary-api';

export type BudgetGroup = {
  categoryId: number;
  name: string;
  ceiling?: Budget;
  children: Budget[];
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
};

/** A parent limit replaces its children's limits in the plan total. */
export function groupBudgets(budgets: Budget[]): BudgetGroup[] {
  const groups = new Map<number, BudgetGroup>();
  for (const budget of budgets) {
    const categoryId = budget.parentCategoryId ?? budget.categoryId ?? -(budget.id ?? groups.size + 1);
    let group = groups.get(categoryId);
    if (!group) {
      group = {
        categoryId,
        name: budget.parentCategoryName ?? budget.categoryName ?? 'Sin agrupar',
        children: [],
        limit: 0,
        spent: 0,
        remaining: 0,
        percentage: 0,
      };
      groups.set(categoryId, group);
    }
    if (budget.parentCategoryId == null) group.ceiling = budget;
    else group.children.push(budget);
  }
  for (const group of groups.values()) {
    const counted = group.ceiling ? [group.ceiling] : group.children;
    group.limit = counted.reduce((sum, budget) => sum + (budget.limitAmount ?? 0), 0);
    group.spent = counted.reduce((sum, budget) => sum + (budget.spentAmount ?? 0), 0);
    group.remaining = counted.reduce((sum, budget) => sum + (budget.remainingAmount ?? 0), 0);
    group.percentage = group.limit > 0 ? (group.spent / group.limit) * 100 : 0;
    group.children.sort((left, right) =>
      (left.categoryName ?? '').localeCompare(right.categoryName ?? '', 'es'),
    );
  }
  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

export function budgetOverview(budgets: Budget[]) {
  const budgetsByCategory = new Map(
    budgets.filter((item) => item.categoryId != null).map((item) => [item.categoryId!, item]),
  );
  const countedBudgets = budgets.filter((item) => {
    if (item.categoryId == null || item.parentCategoryId == null) return true;
    return !budgetsByCategory.has(item.parentCategoryId);
  });
  const limit = countedBudgets.reduce((sum, item) => sum + (item.limitAmount ?? 0), 0);
  const spent = countedBudgets.reduce((sum, item) => sum + (item.spentAmount ?? 0), 0);
  const remaining = countedBudgets.reduce((sum, item) => sum + (item.remainingAmount ?? 0), 0);
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
