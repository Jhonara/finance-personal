import { beforeEach, describe, expect, it, vi } from 'vitest';

const values = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => values.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    if (!/^[\w.-]+$/.test(key)) throw Error('Invalid key');
    values.set(key, value);
  },
}));
import { moneyUnits, requestAmount, remainingAmount, savingsAmount } from './savings-money';
import {
  crossedMilestones,
  presentSavingGoal,
  savingsAccessibility,
  savingsProgressCopy,
  savingsSummary,
} from './savings-presentation';
import { claimSavingsEvent, contributionCelebration, savingsEventKey } from './savings-celebrations';
import { savingContributionSchema, savingGoalSchema } from './savings-schemas';
import { formatMoneyInput, preserveMoneyInput } from '@/ui/presentation';

beforeEach(() => values.clear());

describe('Savings contract and decimal presentation', () => {
  it('subtracts decimal amounts exactly and clamps remaining after an overcontribution', () => {
    expect(remainingAmount(0.3, 0.1)).toBe('0.2');
    expect(remainingAmount(1.0001, 0.9999)).toBe('0.0002');
    expect(remainingAmount(100, 110)).toBe('0');
    expect(remainingAmount(undefined, 0)).toBeUndefined();
  });
  it.each(['0', '-1', '1.00001', 'NaN', '1e9', '999999999999999.9999'])(
    'rejects invalid or inexact request amount %s',
    (value) => {
      expect(requestAmount(value)).toBeUndefined();
    },
  );
  it('keeps canonical money until the JSON number boundary', () => {
    const value = preserveMoneyInput('3.000.000,1250');
    expect(value).toBe('3000000.1250');
    expect(formatMoneyInput(value)).toBe('3.000.000,1250');
    expect(requestAmount(value)).toBe(3000000.125);
    expect(moneyUnits('3000000.1250')).toBe(30000001250n);
  });
  it('preserves all supported decimals and privacy without inventing currency', () => {
    expect(savingsAmount(1234.5678, false)).toBe('1.234,5678');
    expect(savingsAmount(1234.5678, true)).toBe('••••••');
    expect(savingsAmount(undefined, false)).toBe('No disponible');
  });
  it.each([0, 25, 50, 75, 100])('uses backend percentage %s', (progress) => {
    expect(presentSavingGoal({ progress }).percentage).toBe(progress);
    expect(presentSavingGoal({ progress }).completed).toBe(progress >= 100);
  });
  it('does not round 99.99 into a completed goal', () => {
    expect(presentSavingGoal({ progress: 99.99 }).percentageLabel).toBe('99,99%');
    expect(presentSavingGoal({ progress: 99.99 }).completed).toBe(false);
    expect(presentSavingGoal({ progress: 120 }).percentageLabel).toBe('100%');
  });
  it('separates complete goals and never aggregates amounts without currency metadata', () => {
    // These amounts could represent different currencies; the contract cannot identify them.
    const summary = savingsSummary([
      { id: 1, targetAmount: 3000000, currentAmount: 500000, progress: 16 },
      { id: 2, targetAmount: 100, currentAmount: 100, progress: 100 },
    ]);
    expect(summary.active).toHaveLength(1);
    expect(summary.completed).toHaveLength(1);
    expect(Object.keys(summary)).toEqual(['active', 'completed']);
  });
  it('keeps long names intact and masks amounts in accessible copy', () => {
    const name = 'Un fondo de emergencia para los próximos proyectos y planes de toda mi familia';
    const goal = presentSavingGoal({
      id: 1,
      name,
      targetAmount: 3000000,
      currentAmount: 1200000,
      progress: 40,
    });
    expect(goal.name).toBe(name);
    expect(savingsAccessibility(goal, false)).toContain('1.200.000 ahorrados de 3.000.000');
    expect(savingsAccessibility(goal, true)).toContain('40 por ciento completado');
    expect(savingsAccessibility(goal, true)).not.toContain('1.200.000');
    expect(goal.tone).toBe(presentSavingGoal({ ...goal, name: 'Otro' }).tone);
  });
  it('validates only supported creation and contribution fields', () => {
    expect(savingGoalSchema.parse({ name: ' Viaje ', targetAmount: '3000000' })).toEqual({
      name: 'Viaje',
      targetAmount: '3000000',
    });
    expect(savingGoalSchema.safeParse({ name: ' ', targetAmount: '0' }).success).toBe(false);
    expect(
      savingContributionSchema.safeParse({ amount: '250.125', movementDate: '2026-12-31' }).success,
    ).toBe(true);
    expect(savingContributionSchema.safeParse({ amount: '250', movementDate: '2026-02-31' }).success).toBe(
      false,
    );
    expect(
      savingContributionSchema.safeParse({ amount: '250', movementDate: '2026-12-31T00:00:00Z' }).success,
    ).toBe(false);
  });
  it('varies progress copy without punitive language', () => {
    expect(new Set([0, 25, 50, 75, 100].map(savingsProgressCopy)).size).toBe(5);
  });
});

describe('Savings celebrations', () => {
  it.each([25, 50, 75, 100])('celebrates milestone %s once per user and goal', async (milestone) => {
    const before = { id: 1, name: 'Viaje', currentAmount: 20, progress: milestone - 1 };
    const after = { ...before, currentAmount: 30, progress: milestone };
    expect(crossedMilestones(milestone - 1, milestone)).toEqual([milestone]);
    expect(await contributionCelebration(10, before, after)).toBeDefined();
    expect(await contributionCelebration(10, before, after)).toBeUndefined();
    expect(await contributionCelebration(11, before, after)).toBeDefined();
    expect(await contributionCelebration(10, { ...before, id: 2 }, { ...after, id: 2 })).toBeDefined();
  });
  it('combines crossed milestones into one celebration while persisting each key', async () => {
    const event = await contributionCelebration(
      10,
      { id: 1, progress: 0, currentAmount: 0 },
      { id: 1, progress: 110, currentAmount: 110 },
    );
    expect(event?.title).toBe('¡Lo lograste!');
    expect(event?.badges).toEqual(['¡Primer aporte!', '25%', '50%', '75%', '100%']);
    for (const milestone of [25, 50, 75, 100])
      expect(values.get(savingsEventKey(10, `milestone.${milestone}`, 1))).toBe('seen');
  });
  it('announces a first contribution below the first milestone and never on initial data alone', async () => {
    expect(
      await contributionCelebration(
        10,
        { id: 1, currentAmount: 0, progress: 0 },
        { id: 1, currentAmount: 10, progress: 10 },
      ),
    ).toMatchObject({ title: '¡Primer aporte!' });
    expect(
      await contributionCelebration(
        10,
        { id: 1, currentAmount: 50, progress: 50 },
        { id: 1, currentAmount: 50, progress: 50 },
      ),
    ).toBeUndefined();
  });
  it('serializes concurrent claims and separates intro and first-goal keys', async () => {
    expect(
      await Promise.all([claimSavingsEvent(10, 'first-goal'), claimSavingsEvent(10, 'first-goal')]),
    ).toEqual([true, false]);
    expect(await claimSavingsEvent(10, 'intro')).toBe(true);
    expect(await claimSavingsEvent(11, 'first-goal')).toBe(true);
  });
});

it('describes the milestone when actual progress exceeds 75 percent', async () => {
  const result = await contributionCelebration(
    100,
    { id: 8, progress: 70, currentAmount: 700 },
    { id: 8, name: 'Viaje', progress: 81.25, currentAmount: 812.5 },
  );
  expect(result?.title).toBe('¡Nuevo hito: 75%!');
  expect(result?.badges).toEqual(['75%']);
});
