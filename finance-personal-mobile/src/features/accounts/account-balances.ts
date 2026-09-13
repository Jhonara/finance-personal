type DashboardAccount = { id?: number; balance?: number };

/** The dashboard is the server-calculated balance source for every account surface. */
export function balanceForAccount(accounts: DashboardAccount[] | undefined, accountId: number | undefined) {
  return accounts?.find((account) => account.id === accountId)?.balance ?? 0;
}
