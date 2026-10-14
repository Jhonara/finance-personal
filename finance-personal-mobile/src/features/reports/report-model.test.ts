import { describe, expect, it } from 'vitest';
import { reportCategories, reportCurrency, reportMonths } from './report-model';

describe('report data', () => {
  it('keeps monthly summaries gated to a single currency', () => {
    expect(
      reportCurrency({
        accounts: [
          { currency: 'COP', active: true },
          { currency: 'USD', active: true },
        ],
      }),
    ).toBeUndefined();
    expect(
      reportCurrency({
        accounts: [
          { currency: 'COP', active: true },
          { currency: 'USD', active: false },
        ],
      }),
    ).toBeUndefined();
    expect(reportCurrency({ accounts: [{ currency: 'COP', active: true }] })).toBe('COP');
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
      reportCategories({ expenseSummary: { totalByCategory: { Comida: 20, Viajes: 100, Otro: 0 } } }),
    ).toEqual([
      ['Viajes', 100],
      ['Comida', 20],
    ]);
  });
});
