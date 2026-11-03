import { describe, expect, it } from 'vitest';
import { categories, comparisonMonths, daily, expense, income, weeks } from './sample-month';

describe('shared visual prototype fixture', () => {
  it('reconciles every visual breakdown with the same month', () => {
    expect(income).toBe(4_200_000);
    expect(expense).toBe(2_730_000);
    for (const breakdown of [categories, daily, weeks]) {
      expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(expense);
    }
    expect(daily.at(-1)?.net).toBe(1_470_000);
    expect(Math.min(...daily.map((day) => day.net))).toBeLessThan(0);
  });

  it('keeps unavailable information distinct from an empty response', () => {
    expect(comparisonMonths[0]).toMatchObject({ state: 'unavailable', income: null, expense: null });
    expect(comparisonMonths[1]).toMatchObject({ state: 'empty', income: 0, expense: 0 });
    expect(comparisonMonths.filter((month) => month.state === 'records')).toHaveLength(1);
    expect(daily.find((day) => day.day === 4)).toMatchObject({ hasRecords: false, amount: 0 });
  });
});
