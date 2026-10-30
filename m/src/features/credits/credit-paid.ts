import * as SecureStore from 'expo-secure-store';
import type { Credit } from '@/features/secondary/secondary-api';

const claims = new Map<string, Promise<boolean>>();
export const creditPaidKey = (userId: number, creditId: number) =>
  `finance-credit-v1.user.${userId}.credit.${creditId}.paid`;
export async function claimCreditPaid(
  userId: number,
  creditId: number,
  before: Credit['status'],
  after: Credit['status'],
) {
  if (!before || before === 'PAID' || after !== 'PAID') return false;
  const key = creditPaidKey(userId, creditId);
  if (claims.has(key)) {
    await claims.get(key);
    return false;
  }
  const claim = (async () => {
    if (await SecureStore.getItemAsync(key)) return false;
    await SecureStore.setItemAsync(key, 'seen');
    return true;
  })();
  claims.set(key, claim);
  try {
    return await claim;
  } finally {
    claims.delete(key);
  }
}
