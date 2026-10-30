import { describe, expect, it } from 'vitest';
import {
  reportCategories,
  reportCurrencies,
  reportMonths,
  currencyMonth,
  categoryRows,
  comparisonPercent,
  periodContext,
} from './report-model';

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
  it('keeps unavailable months distinct from an empty currency in a loaded month', () => {
    expect(currencyMonth(undefined, 'COP')).toBeUndefined();
    expect(currencyMonth({}, 'COP')).toEqual({ income: 0, expense: 0, expensesByCategory: {} });
    expect(currencyMonth({ USD: { income: 900, expense: 50, expensesByCategory: {} } }, 'COP')?.income).toBe(
      0,
    );
  });
  it('does not invent percentages with a zero, negative or missing comparison base', () => {
    expect(comparisonPercent(150, 100)).toBe(50);
    expect(comparisonPercent(0, 100)).toBe(-100);
    expect(comparisonPercent(100, 0)).toBeUndefined();
    expect(comparisonPercent(100, undefined)).toBeUndefined();
    expect(comparisonPercent(-100, 100)).toBeUndefined();
    expect(comparisonPercent(Infinity, 100)).toBeUndefined();
  });
  it('preserves reversals and missing comparison data in the category report', () => {
    const rows = categoryRows({ income: 0, expense: 80, expensesByCategory: { Mercado: 100, Ajuste: -20 } });
    expect(rows.map((row) => row.amount)).toEqual([100, -20]);
    expect(rows[1]?.percentage).toBeUndefined();
    expect(rows[0]?.previous).toBeUndefined();
    expect(
      categoryRows(
        { income: 0, expense: 10, expensesByCategory: { Nuevo: 10 } },
        { income: 0, expense: 0, expensesByCategory: {} },
      )[0]?.previous,
    ).toBe(0);
  });
  it('labels current, future and completed months explicitly', () => {
    const now = { year: 2026, month: 10 };
    expect(periodContext(now, now)).toContain('Mes en curso');
    expect(periodContext({ year: 2027, month: 1 }, now)).toContain('Mes futuro');
    expect(periodContext({ year: 2025, month: 12 }, now)).toContain('Mes terminado');
    expect(reportMonths({ year: 2026, month: 1 }, 12)).toHaveLength(12);
  });
});
