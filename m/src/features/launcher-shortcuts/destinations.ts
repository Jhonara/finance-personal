const destinations = {
  expense: '/(app)/new-expense',
  income: '/(app)/new-income',
  transfer: '/(app)/new-transfer',
  balance: '/(app)/accounts',
} as const;

/** Only navigation identifiers are accepted. Never accept amounts, account IDs or arbitrary return URLs. */
export function launcherDestination(action: string | string[] | undefined) {
  if (typeof action !== 'string' || !Object.hasOwn(destinations, action)) return undefined;
  return destinations[action as keyof typeof destinations];
}
