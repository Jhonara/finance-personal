import { describe, expect, it } from 'vitest';
import { reportCategories, reportCurrencies, reportMonths } from './report-model';

describe('report data', () => {
  it('offers every valid currency without adding their amounts', () => {
    expect(
      reportCurrencies(
        [
          { COP: { income: 10, expense: 2, expensesByCategory: {} } },
          { USD: { income: 8, expense: 3, expensesByCategory: {} } },
        ],
        ['COP', 'EUR'],
      ),
    ).toEqual(['COP', 'EUR', 'USD']);
  });
  it('moves the six month window across years', () => {
    expect(reportMonths({ year: 2026, month: 2 })).toEqual([
      { year: 2025, month: 9 },
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
  });
  it('sorts only valid category totals', () => {
    expect(
      reportCategories({ income: 0, expense: 120, expensesByCategory: { Comida: 20, Viajes: 100, Otro: 0 } }),
    ).toEqual([
      ['Viajes', 100],
      ['Comida', 20],
    ]);
  });
});
