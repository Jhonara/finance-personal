import { describe, expect, it } from 'vitest';
import { filterCount, normalizeTransactionFilters, validateTransactionFilters } from './filters';

describe('transaction filters', () => {
  it('uses a deterministic filter shape and preserves account, category, type and status', () => {
    expect(
      normalizeTransactionFilters({ accountId: 3, categoryId: 7, type: 'EXPENSE', status: 'POSTED' }),
    ).toEqual({ accountId: 3, categoryId: 7, type: 'EXPENSE', status: 'POSTED' });
  });
  it('keeps month and range periods mutually exclusive', () => {
    expect(
      normalizeTransactionFilters({ year: 2026, month: 8, from: '2026-08-01', to: '2026-08-31' }),
    ).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });
  it('rejects an inverted range before making a request', () => {
    expect(validateTransactionFilters({ from: '2026-08-31', to: '2026-08-01' })).toBeTruthy();
  });
  it('reports active filters for the filter control and filtered empty state', () => {
    expect(filterCount({ accountId: 2, type: 'INCOME' })).toBe(2);
  });
});
