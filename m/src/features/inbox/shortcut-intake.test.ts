import { describe, expect, it } from 'vitest';
import { parseShortcutIntake } from './shortcut-intake';

describe('External shortcut input', () => {
  it('accepts explicit fields and retains the same request identity on replay', () => {
    const params = {
      v: '1',
      kind: 'EXPENSE',
      amount: '12500.50',
      currency: 'COP',
      description: 'Café & Pan',
      date: '2026-10-23',
      id: '12345678-1234-1234-1234-123456789012',
    };
    const result = parseShortcutIntake(params);
    expect(result).toEqual(parseShortcutIntake(params));
    expect(result.ok && result.intake.values).toMatchObject({
      amount: '12500.50',
      effectiveDate: '2026-10-23',
      description: 'Café & Pan',
    });
    expect(result.ok && result.intake.requestKey).toBe(`shortcut-${params.id}`);
  });
  it('does not assume an amount, currency, date or expense type when missing', () => {
    expect(parseShortcutIntake({ v: '1' })).toMatchObject({
      ok: true,
      intake: { values: { amount: '', currency: '', effectiveDate: '', kind: 'OTHER' } },
    });
  });
  it.each([
    { v: '2' },
    { v: ['1', '1'] },
    { v: '1', amount: '-50' },
    { v: '1', amount: '1e6' },
    { v: '1', amount: '85.000,50' },
    { v: '1', amount: '0' },
    { v: '1', date: '2026-02-31' },
    { v: '1', date: '23/10/2026' },
    { v: '1', currency: '$' },
    { v: '1', accountId: '1' },
    { v: '1', token: 'secret' },
    { v: '1', confirm: 'true' },
    { v: '1', text: 'raw message' },
    { v: '1', description: 'a'.repeat(121) },
    { v: '1', description: 'line\nbreak' },
    { v: '1', id: '../records' },
    { v: '1', kind: 'CREDIT_PAYMENT' },
  ])('rejects malformed or disallowed fields: %j', (params) => {
    expect(parseShortcutIntake(params).ok).toBe(false);
  });
  it('marks a sample as preview-only without granting any write permission', () => {
    expect(parseShortcutIntake({ v: '1', demo: '1' })).toMatchObject({ ok: true, intake: { demo: true } });
  });
});
