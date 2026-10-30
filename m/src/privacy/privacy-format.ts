import { formatMoney } from '@/utils/money';

export function formatPrivateMoney(amount: number | string, currency: string, hidden: boolean): string {
  return hidden ? '$ ••••••' : formatMoney(amount, currency);
}
