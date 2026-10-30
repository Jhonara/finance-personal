// Shared exact decimal arithmetic. Up to four decimal places, without floating-point sums.
const scale = 10000n;
export function moneyUnits(value: string | number | undefined): bigint | undefined {
  if (value === undefined) return undefined;
  const text = String(value);
  if (!/^\d{1,15}(\.\d{1,4})?$/.test(text)) return undefined;
  const [whole = '0', fraction = ''] = text.split('.');
  return BigInt(whole) * scale + BigInt(fraction.padEnd(4, '0'));
}

export function canonicalAmount(units: bigint): string {
  const fraction = (units % scale).toString().padStart(4, '0').replace(/0+$/, '');
  return `${units / scale}${fraction ? `.${fraction}` : ''}`;
}

export function requestAmount(value: string): number | undefined {
  const units = moneyUnits(value);
  if (units === undefined || units <= 0n) return undefined;
  // The API requires a JSON number. Reject values that would change on serialization.
  const amount = Number(canonicalAmount(units));
  return moneyUnits(String(amount)) === units ? amount : undefined;
}
