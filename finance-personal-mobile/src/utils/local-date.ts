export const localDateFromNative = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const nativeFromLocalDate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

const monthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Calendar components only: presentation never passes a LocalDate through UTC. */
export function formatLocalDate(value?: string | null, format: 'long' | 'compact' = 'long'): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Fecha no disponible';
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]!) return 'Fecha no disponible';
  return format === 'compact'
    ? `${day} ${shortMonths[month - 1]} ${year}`
    : `${day} de ${monthNames[month - 1]} de ${year}`;
}
