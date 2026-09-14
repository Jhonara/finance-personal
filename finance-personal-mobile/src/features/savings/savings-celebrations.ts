import * as SecureStore from 'expo-secure-store';
import type { SavingGoal } from '@/features/secondary/secondary-api';
import { crossedMilestones } from './savings-presentation';

export type SavingsCelebration = { title: string; message: string; badges?: string[] };
export const savingsEventKey = (userId: number, event: string, goalId?: number) =>
  `finance-savings-v1.user.${userId}${goalId === undefined ? '' : `.goal.${goalId}`}.${event}`;

const claims = new Map<string, Promise<boolean>>();
export async function wasSavingsEventSeen(userId: number, event: string, goalId?: number) {
  return (await SecureStore.getItemAsync(savingsEventKey(userId, event, goalId))) === 'seen';
}
export async function claimSavingsEvent(userId: number, event: string, goalId?: number) {
  const key = savingsEventKey(userId, event, goalId);
  if (claims.has(key)) {
    await claims.get(key);
    return false;
  }
  const claim = (async () => {
    if ((await SecureStore.getItemAsync(key)) === 'seen') return false;
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

export async function contributionCelebration(
  userId: number,
  before: SavingGoal,
  after: SavingGoal,
): Promise<SavingsCelebration | undefined> {
  if (after.id === undefined) return undefined;
  const first =
    before.currentAmount === 0 &&
    (after.currentAmount ?? 0) > 0 &&
    (await claimSavingsEvent(userId, 'first-contribution', after.id));
  const reached: number[] = [];
  if (before.progress !== undefined && after.progress !== undefined) {
    for (const milestone of crossedMilestones(before.progress, after.progress)) {
      if (await claimSavingsEvent(userId, `milestone.${milestone}`, after.id)) reached.push(milestone);
    }
  }
  const highest = reached.at(-1);
  if (highest === undefined && !first) return undefined;
  return {
    title: highest === 100 ? '¡Lo lograste!' : highest ? `¡Llegaste al ${highest}%!` : '¡Primer aporte!',
    message:
      highest === 100
        ? 'Completaste tu objetivo de ahorro.'
        : highest === 50
          ? `Ya recorriste la mitad del camino hacia ${after.name ?? 'tu meta'}.`
          : highest
            ? `Cada paso te acerca a ${after.name ?? 'tu meta'}.`
            : 'Ya empezaste a construir esta meta.',
    badges: [...(first && highest ? ['¡Primer aporte!'] : []), ...reached.map((value) => `${value}%`)],
  };
}
