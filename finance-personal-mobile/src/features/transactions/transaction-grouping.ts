import type { Transaction } from './transactions-api';

export type TransactionDateGroup<T extends Transaction = Transaction> = {
  date: string;
  label: string;
  items: T[];
};

export function groupTransactionsByDate<T extends Transaction>(
  items: T[],
  today = new Date(),
): TransactionDateGroup<T>[] {
  const groups: TransactionDateGroup<T>[] = [];
  const ids = new Set<number>();
  for (const item of items) {
    if (item.id !== undefined && ids.has(item.id)) continue;
    if (item.id !== undefined) ids.add(item.id);
    const date = item.effectiveDate ?? '';
    const previous = groups[groups.length - 1];
    if (previous?.date === date) previous.items.push(item);
    else groups.push({ date, label: humanTransactionDate(date, today), items: [item] });
  }
  return groups;
}

export function humanTransactionDate(value: string, today = new Date()): string {
  const parsed = parseLocalDate(value);
  if (!parsed) return 'Sin fecha';
  const current = startOfDay(today);
  const difference = Math.round((current.getTime() - parsed.getTime()) / 86_400_000);
  if (difference === 0) return 'Hoy';
  if (difference === 1) return 'Ayer';
  const month = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(parsed);
  return parsed.getFullYear() === current.getFullYear()
    ? `${parsed.getDate()} de ${month}`
    : `${parsed.getDate()} de ${month} de ${parsed.getFullYear()}`;
}

function parseLocalDate(value: string): Date | undefined {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : undefined;
}
function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
