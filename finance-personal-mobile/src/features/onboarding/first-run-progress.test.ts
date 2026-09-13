import { describe, expect, it } from 'vitest';

import { createSetupSteps, setupProgress } from './first-run-progress';

describe('guided first run progress', () => {
  it('keeps every step pending for a new user', () => {
    const steps = createSetupSteps({
      accountCount: 0,
      budgetCount: 0,
      openingBalanceRegistered: false,
      recentTransactions: [],
    });
    expect(setupProgress(steps)).toMatchObject({ completed: 0, total: 4, recommended: 'account' });
  });

  it('does not count an opening balance as an operating movement', () => {
    const steps = createSetupSteps({
      accountCount: 1,
      budgetCount: 0,
      openingBalanceRegistered: true,
      recentTransactions: [{ type: 'OPENING_BALANCE', status: 'POSTED' }],
    });
    expect(steps.find((step) => step.id === 'movement')?.completed).toBe(false);
  });

  it('resolves the opening balance step as skipped after an ordinary movement', () => {
    const steps = createSetupSteps({
      accountCount: 1,
      budgetCount: 0,
      openingBalanceRegistered: false,
      recentTransactions: [{ type: 'EXPENSE', status: 'POSTED' }],
    });
    expect(steps.find((step) => step.id === 'openingBalance')).toMatchObject({
      completed: true,
      resolutionLabel: 'Omitido',
    });
  });

  it.each([
    [1, { accountCount: 1, budgetCount: 0, openingBalanceRegistered: false, recentTransactions: [] }],
    [2, { accountCount: 1, budgetCount: 0, openingBalanceRegistered: true, recentTransactions: [] }],
    [
      3,
      {
        accountCount: 1,
        budgetCount: 0,
        openingBalanceRegistered: true,
        recentTransactions: [{ type: 'TRANSFER', status: 'POSTED' }],
      },
    ],
  ])('reports %i of 4 completed', (completed, signals) => {
    expect(setupProgress(createSetupSteps(signals)).completed).toBe(completed);
  });

  it('completes the setup from real account, transaction and budget signals', () => {
    const steps = createSetupSteps({
      accountCount: 1,
      budgetCount: 1,
      openingBalanceRegistered: true,
      recentTransactions: [{ type: 'INCOME', status: 'POSTED' }],
    });
    expect(setupProgress(steps)).toMatchObject({ completed: 4, isComplete: true });
  });
});
