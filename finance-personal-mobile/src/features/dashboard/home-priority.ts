import type { DashboardMonth } from '@/api/dashboard-api';
import { financialProgress } from '@/features/progress/financial-progress';
import { formatLocalDate } from '@/utils/local-date';
import { formatDashboardPeriod, type DashboardPeriod } from './dashboard-period';
import { homePlan } from './home-plan';

export const homePriorities = [
  {
    id: 0,
    value: 'general',
    label: 'Vista general',
    subtitle: 'Un poco de todo: cuentas, gastos, créditos y metas.',
    icon: 'grid-outline',
    tone: 'info',
  },
  {
    id: 1,
    value: 'expenses',
    label: 'Controlar mis gastos',
    subtitle: 'Destaca presupuestos y el seguimiento de tus gastos.',
    icon: 'pie-chart-outline',
    tone: 'info',
  },
  {
    id: 2,
    value: 'debt',
    label: 'Organizar mis deudas',
    subtitle: 'Ten a mano tus créditos y los pagos por revisar.',
    icon: 'card-outline',
    tone: 'primary',
  },
  {
    id: 3,
    value: 'savings',
    label: 'Ahorrar para mis metas',
    subtitle: 'Destaca el avance de tus objetivos de ahorro.',
    icon: 'flag-outline',
    tone: 'success',
  },
] as const;
export type HomePriority = (typeof homePriorities)[number]['value'];

export function parseHomePriority(value: unknown): HomePriority {
  return homePriorities.find((option) => option.value === value)?.value ?? 'general';
}

export function homePriorityKey(userId: number) {
  return `finance-home-priority-v1.${userId}`;
}

export type HomeShortcut = 'budgets' | 'savings' | 'credits' | 'reports';
export const priorityShortcuts: Record<HomePriority, readonly HomeShortcut[]> = {
  general: ['budgets', 'savings', 'credits', 'reports'],
  expenses: ['budgets', 'reports', 'savings', 'credits'],
  debt: ['credits', 'budgets', 'savings', 'reports'],
  savings: ['savings', 'budgets', 'credits', 'reports'],
};

type HighlightDestination =
  | { pathname: '/(app)/budgets'; params: DashboardPeriod }
  | { pathname: '/(app)/credit-detail' | '/(app)/saving-detail'; params: { id: number } }
  | '/(app)/credits'
  | '/(app)/savings';
export type HomePriorityHighlight = {
  title: string;
  context: string;
  description: string;
  action: string;
  destination: HighlightDestination;
  percentage?: number;
};

// These highlights only present server data; they never infer balances or payments.
export function homePriorityHighlight(
  priority: HomePriority,
  dashboard: DashboardMonth,
  period: DashboardPeriod,
): HomePriorityHighlight | undefined {
  if (priority === 'expenses') {
    const { budgetPercent } = homePlan(dashboard, period);
    return {
      context: formatDashboardPeriod(period),
      title:
        budgetPercent === undefined
          ? 'Dale un límite a tus gastos'
          : `${budgetPercent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% del presupuesto utilizado`,
      description:
        budgetPercent === undefined
          ? 'Empieza con una categoría y ajusta su límite a tu ritmo.'
          : 'Revisa cuánto llevas gastado en cada categoría.',
      action: 'Ver presupuestos',
      destination: { pathname: '/(app)/budgets', params: period },
      percentage: budgetPercent,
    };
  }
  if (priority === 'debt') {
    const credits = (dashboard.credits ?? []).filter(
      (credit) => credit.status === 'ACTIVE' || credit.status === 'LATE',
    );
    const credit = [...credits].sort(
      (a, b) =>
        Number(b.status === 'LATE') - Number(a.status === 'LATE') ||
        (a.nextPaymentDate || '9999').localeCompare(b.nextPaymentDate || '9999') ||
        (a.id ?? Infinity) - (b.id ?? Infinity),
    )[0];
    const date = formatLocalDate(credit?.nextPaymentDate);
    return {
      context: 'Créditos · estado actual',
      title: credit
        ? credit.name?.trim() || 'Tu próximo crédito por revisar'
        : 'Tus créditos, en un solo lugar',
      description:
        credit?.status === 'LATE'
          ? 'Hay pagos por revisar según tus registros. Si ya pagaste, anótalo o actualiza tu extracto.'
          : credit && date !== 'Fecha no disponible'
            ? `Próxima fecha del plan: ${date}. Registra los pagos que ya hayas realizado.`
            : 'Consulta tus créditos o registra uno nuevo, incluso si ya empezaste a pagarlo.',
      action:
        credit && Number.isSafeInteger(credit.id) && credit.id! > 0 ? 'Revisar este crédito' : 'Ver créditos',
      destination:
        credit && Number.isSafeInteger(credit.id) && credit.id! > 0
          ? { pathname: '/(app)/credit-detail', params: { id: credit.id! } }
          : '/(app)/credits',
    };
  }
  if (priority === 'savings') {
    const signal = financialProgress({ dashboard, period }).find((item) => item.kind === 'savings');
    return {
      context: 'Metas · avance actual',
      title: signal?.title ?? 'Dale forma a tu próxima meta',
      description: signal
        ? 'Anota los aportes que ya apartaste para seguir tu progreso.'
        : 'Ponle nombre a tu objetivo y registra lo que vas ahorrando.',
      action: signal?.destination ? 'Ver esta meta' : 'Ver metas',
      destination:
        signal?.destination?.pathname === '/(app)/saving-detail' ? signal.destination : '/(app)/savings',
      percentage: signal?.percentage,
    };
  }
  return undefined;
}
