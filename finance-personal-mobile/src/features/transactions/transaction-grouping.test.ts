import { describe, expect, it } from 'vitest';
import { groupTransactionsByDate, humanTransactionDate } from './transaction-grouping';

const today = new Date(2026, 8, 12);
describe('transaction grouping', () => {
  it('uses local human date headers', () => {
    expect(humanTransactionDate('2026-09-12', today)).toBe('Hoy');
    expect(humanTransactionDate('2026-09-11', today)).toBe('Ayer');
    expect(humanTransactionDate('2025-09-12', today)).toBe('12 de septiembre de 2025');
  });
  it('joins same-date records across pages and removes repeated ids', () => {
    const groups = groupTransactionsByDate(
      [
        { id: 2, effectiveDate: '2026-09-12' },
        { id: 1, effectiveDate: '2026-09-12' },
        { id: 1, effectiveDate: '2026-09-12' },
        { id: 3, effectiveDate: '2026-09-11' },
      ],
      today,
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]?.items).toHaveLength(2);
  });
});
