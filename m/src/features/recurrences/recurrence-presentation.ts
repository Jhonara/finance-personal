import { toApiError } from '@/api/errors';
import type { Frequency, RecurringRule } from './recurrence-api';

export const frequencies: { value: Frequency; label: string; detail: string }[] = [
  { value: 'MONTHLY', label: 'Cada mes', detail: 'Una vez al mes, en el día que elijas.' },
  {
    value: 'SEMIMONTHLY',
    label: 'Dos veces al mes',
    detail: 'Por ejemplo, el 15 y el último día. Son 24 pagos al año.',
  },
  { value: 'WEEKLY', label: 'Cada semana', detail: 'Cada 7 días, desde la primera fecha.' },
  {
    value: 'BIWEEKLY',
    label: 'Cada 14 días',
    detail: 'Cada dos semanas. No coincide siempre con el 15 y fin de mes.',
  },
];
export function scheduleLabel(rule: Pick<RecurringRule, 'frequency' | 'firstDay' | 'secondDay'>) {
  const day = (value: number | null) => (value === 31 ? 'último día' : `${value}`);
  if (rule.frequency === 'MONTHLY') return `Cada mes · ${day(rule.firstDay)}`;
  if (rule.frequency === 'SEMIMONTHLY') return `${day(rule.firstDay)} y ${day(rule.secondDay)} de cada mes`;
  return frequencies.find((item) => item.value === rule.frequency)?.label ?? '';
}
export function recurrenceError(error: unknown) {
  const detail = toApiError(error);
  return detail.status === 400 || detail.status === 409
    ? detail.message
    : detail.status === 404
      ? 'Esta programación o uno de sus datos ya no está disponible. Actualiza e inténtalo de nuevo.'
      : 'No pudimos completar la solicitud. Tus datos siguen aquí; puedes reintentar.';
}
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
  } catch {
    return 'America/Bogota';
  }
}
