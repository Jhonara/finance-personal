export type FinancialDate = `${number}-${number}-${number}`;

export function isFinancialDate(value: string): value is FinancialDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatFinancialDate(value: FinancialDate): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
