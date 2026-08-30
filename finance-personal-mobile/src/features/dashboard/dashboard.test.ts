import { describe, expect, it } from 'vitest';

import { alertPresentation, currencyEntries, toBudget, toTransaction } from './dashboard-adapter';
import { currentDashboardPeriod, shiftDashboardPeriod } from './dashboard-period';

describe('dashboard adapters', () => {
  it('keeps currencies separate and does not combine their values', () => {
    expect(currencyEntries({ COP: 8450000, USD: 200 })).toEqual([
      { currency: 'COP', amount: 8450000 },
      { currency: 'USD', amount: 200 },
    ]);
  });

  it('maps Dashboard data to UI labels without backend codes', () => {
    expect(
      toTransaction({
        type: 'TRANSFER',
        description: 'Ahorro',
        effectiveDate: '2026-08-30',
        amount: 1000,
        currency: 'COP',
      }).type,
    ).toBe('TRANSFER');
    expect(
      toBudget({
        categoryName: 'Transporte',
        spentAmount: 400000,
        limitAmount: 500000,
        remainingAmount: 100000,
        percentageUsed: 80,
        status: 'WARNING',
      }).status,
    ).toBe('WARNING');
    expect(
      alertPresentation({ code: 'BUDGET_WARNING', severity: 'WARNING', message: 'Cerca del límite' }).title,
    ).toBe('Presupuesto en atención');
  });

  it('moves months safely across year boundaries', () => {
    expect(currentDashboardPeriod(new Date(2026, 7, 30))).toEqual({ year: 2026, month: 8 });
    expect(shiftDashboardPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});
