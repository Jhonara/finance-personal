import { formatMoneyInput } from '@/ui/presentation';
import { moneyUnits, canonicalAmount } from '@/utils/decimal-money';
export { moneyUnits, canonicalAmount, requestAmount } from '@/utils/decimal-money';

export function remainingAmount(target: number | undefined, current: number | undefined) {
  const targetUnits = moneyUnits(target);
  const currentUnits = moneyUnits(current);
  if (targetUnits === undefined || currentUnits === undefined) return undefined;
  return canonicalAmount(targetUnits > currentUnits ? targetUnits - currentUnits : 0n);
}

export function savingsAmount(value: string | number | undefined, hidden: boolean) {
  if (hidden) return '••••••';
  const units = moneyUnits(value);
  return units === undefined ? 'No disponible' : formatMoneyInput(canonicalAmount(units));
}
