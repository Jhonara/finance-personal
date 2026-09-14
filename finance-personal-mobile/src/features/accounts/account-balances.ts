type DashboardAccount = { id?: number; balance?: number };

export type AccountBalance =
  { status: 'known'; amount: number } | { status: 'loading' } | { status: 'unavailable' };

type BalanceSource = {
  data?: { accounts?: DashboardAccount[] };
  isPending: boolean;
  isError: boolean;
};

/** Query data retains the last reconciled balance during refetch, including a failed refetch. */
export function balanceForAccount(source: BalanceSource, accountId: number | undefined): AccountBalance {
  const amount =
    accountId === undefined
      ? undefined
      : source.data?.accounts?.find((account) => account.id === accountId)?.balance;
  if (typeof amount === 'number' && Number.isFinite(amount)) return { status: 'known', amount };
  return { status: source.isPending && !source.isError ? 'loading' : 'unavailable' };
}

/** Call with accounts of one currency only; a partial total must never look like a known total. */
export function totalAccountBalance(balances: AccountBalance[]): AccountBalance {
  if (balances.some((balance) => balance.status === 'unavailable')) return { status: 'unavailable' };
  if (balances.some((balance) => balance.status === 'loading')) return { status: 'loading' };
  return {
    status: 'known',
    amount: balances.reduce((sum, balance) => sum + (balance.status === 'known' ? balance.amount : 0), 0),
  };
}
