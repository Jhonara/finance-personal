export const accountTypeLabels: Record<string, string> = {
  BANK: 'Banco',
  CASH: 'Efectivo',
  DIGITAL_WALLET: 'Billetera digital',
  SAVINGS: 'Ahorros',
  INVESTMENT: 'Inversión',
  OTHER: 'Otro',
};
export const accountTypeLabel = (type?: string) => (type ? (accountTypeLabels[type] ?? 'Cuenta') : 'Cuenta');
