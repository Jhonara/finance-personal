import { describe, expect, it } from 'vitest';
import { presentTransaction } from './transaction-presentation';

describe('transaction presenter', () => {
  it('prefers an expense description and falls back safely', () => {
    expect(presentTransaction({ type: 'EXPENSE', description: 'Hamburguesa' }).title).toBe('Hamburguesa');
    expect(presentTransaction({ type: 'EXPENSE', categoryName: 'Mercado' }).title).toBe('Mercado');
    expect(presentTransaction({ type: 'EXPENSE' }).title).toBe('Gasto');
  });
  it('presents income, transfers and special financial events', () => {
    expect(presentTransaction({ type: 'INCOME', categoryName: 'Nómina' }).title).toBe('Nómina');
    expect(
      presentTransaction({ type: 'TRANSFER', destinationAccountName: 'Nequi', sourceAccountName: 'Banco' })
        .title,
    ).toBe('Transferencia a Nequi');
    expect(presentTransaction({ type: 'OPENING_BALANCE' }).title).toBe('Saldo inicial');
    expect(presentTransaction({ type: 'REVERSAL' }).title).toBe('Reversión');
    expect(presentTransaction({ type: 'CREDIT_PAYMENT' }).title).toBe('Pago de crédito');
  });
  it('uses human readable statuses and semantic signs', () => {
    expect(presentTransaction({ type: 'INCOME', status: 'POSTED' })).toMatchObject({
      statusLabel: 'Registrado',
      amountPrefix: '+',
    });
    expect(presentTransaction({ type: 'EXPENSE', status: 'REVERSED' })).toMatchObject({
      statusLabel: 'Revertido',
      amountPrefix: '-',
    });
  });
});

import { toTransaction } from '../dashboard/dashboard-adapter';
it.each([
  'INCOME',
  'EXPENSE',
  'TRANSFER',
  'OPENING_BALANCE',
  'REVERSAL',
  'CREDIT_DISBURSEMENT',
  'CREDIT_PAYMENT',
])('Home and History share the %s presenter', (type) => {
  const record = { type, effectiveDate: '2026-09-16', accountName: 'Nequi' };
  const home = toTransaction(record);
  const history = presentTransaction(record);
  expect(home.title).toBe(history.title);
  expect(home.subtitle).toBe(history.subtitle);
  expect(home.title).not.toBe('Movimiento');
});
