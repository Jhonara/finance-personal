import type { QueryClient } from '@tanstack/react-query';
import { getBudgets } from '@/features/secondary/secondary-api';
import { secondaryKeys } from '@/features/secondary/use-secondary';
import { formatDashboardPeriod } from '@/features/dashboard/dashboard-period';
import type { presentAlert } from './alert-presentation';

export async function alertDestination(
  target: ReturnType<typeof presentAlert>['target'],
  client: QueryClient,
) {
  if (!target) return undefined;
  if (target.kind === 'credit')
    return { pathname: '/(app)/credit-detail' as const, params: { id: String(target.id) } };
  const budgets = await client.fetchQuery({
    queryKey: secondaryKeys.budgets(target.year, target.month),
    queryFn: () => getBudgets(target.year, target.month),
    staleTime: 0,
  });
  const budget = budgets.find((item) => item.id === target.id);
  if (
    !budget ||
    [
      budget.version,
      budget.limitAmount,
      budget.spentAmount,
      budget.remainingAmount,
      budget.percentageUsed,
    ].some((value) => typeof value !== 'number' || !Number.isFinite(value)) ||
    !budget.status
  )
    return undefined;
  return {
    pathname: '/(app)/budget-detail' as const,
    params: {
      id: String(budget.id),
      version: String(budget.version),
      limit: String(budget.limitAmount),
      spent: String(budget.spentAmount),
      remaining: String(budget.remainingAmount),
      percentage: String(budget.percentageUsed),
      category: budget.categoryName ?? 'Presupuesto',
      categoryId: String(budget.categoryId ?? ''),
      year: String(target.year),
      month: String(target.month),
      status: budget.status,
      period: formatDashboardPeriod(target),
    },
  };
}
