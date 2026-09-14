import type { SavingGoal } from '@/features/secondary/secondary-api';
import { remainingAmount, savingsAmount } from './savings-money';

export const milestones = [25, 50, 75, 100] as const;
export function savingsProgressCopy(percent: number | undefined) {
  if (percent === undefined) return 'Cada aporte cuenta para tu objetivo.';
  if (percent >= 100) return 'Meta cumplida.';
  if (percent >= 75) return 'Estás cada vez más cerca.';
  if (percent >= 50) return 'Ya recorriste la mitad del camino.';
  if (percent >= 25) return 'Ya estás avanzando.';
  return 'Todo gran objetivo empieza con el primer paso.';
}

export function presentSavingGoal(goal: SavingGoal, progress = goal.progress) {
  const percentage =
    typeof progress === 'number' && Number.isFinite(progress) ? Math.max(0, progress) : undefined;
  const completed = goal.completed === true || (percentage !== undefined && percentage >= 100);
  return {
    ...goal,
    name: goal.name?.trim() || 'Meta de ahorro',
    percentage,
    percentageLabel:
      percentage === undefined
        ? 'Progreso no disponible'
        : `${Math.min(100, percentage).toLocaleString('es-CO', { maximumFractionDigits: 2 })}%`,
    completed,
    status: completed ? 'Meta cumplida ✓' : 'En progreso',
    remaining: remainingAmount(goal.targetAmount, goal.currentAmount),
    tone: completed
      ? ('success' as const)
      : ((['primary', 'accent', 'info'] as const)[Math.abs(goal.id ?? 0) % 3] ?? 'primary'),
    copy: savingsProgressCopy(percentage),
  };
}
export type PresentedSavingGoal = ReturnType<typeof presentSavingGoal>;

export function savingsAccessibility(goal: PresentedSavingGoal, hidden: boolean) {
  return `${goal.name}. ${goal.percentageLabel.replace('%', ' por ciento completado')}. ${goal.status}. ${hidden ? 'Importes ocultos.' : `${savingsAmount(goal.currentAmount, false)} ahorrados de ${savingsAmount(goal.targetAmount, false)}. Te faltan ${savingsAmount(goal.remaining, false)}.`}`;
}

export function savingsSummary(goals: SavingGoal[]) {
  const presented = goals.map((goal) => presentSavingGoal(goal));
  // No currency field exists in this contract, so amounts cannot be safely aggregated.
  return {
    active: presented.filter((goal) => !goal.completed),
    completed: presented.filter((goal) => goal.completed),
  };
}

export function crossedMilestones(before: number, after: number) {
  return milestones.filter((milestone) => before < milestone && after >= milestone);
}
