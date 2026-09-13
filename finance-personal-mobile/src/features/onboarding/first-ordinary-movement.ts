export function hasHistoricalOrdinaryMovement(results: Array<boolean | undefined>): boolean {
  return results.some((result) => result === true);
}
