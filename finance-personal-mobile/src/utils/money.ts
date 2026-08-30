export function formatMoney(amount: string | number, currency: string, locale = 'es-CO'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(
    Number(amount),
  );
}
