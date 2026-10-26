import { describe, expect, it } from 'vitest';
import { interpretFinancialText } from './interpret-text';

describe('common financial text interpreter', () => {
  it('suggests a Colombian purchase while ignoring the available balance', () => {
    expect(
      interpretFinancialText(
        'Compraste COP 85.000,50 en MERCADO CENTRAL el 23/10/2026. Saldo disponible COP 400.000 con tarjeta 1234',
        'SHARED_TEXT',
      ),
    ).toMatchObject({
      kind: 'EXPENSE',
      amount: '85000.50',
      currency: 'COP',
      effectiveDate: '2026-10-23',
      description: 'MERCADO CENTRAL',
      source: 'SHARED_TEXT',
    });
  });

  it.each([
    ['Recibiste COP 1.200.000 por nómina', 'INCOME'],
    ['Transferiste COP 35.000 a otra cuenta', 'TRANSFER'],
    ['Retiraste COP 40.000 en cajero', 'WITHDRAWAL'],
    ['Pagaste cuota de crédito COP 350.000', 'CREDIT_PAYMENT'],
    ['Devolución de compra COP 25.000', 'REFUND'],
    ['Reverso de pago COP 25.000', 'REVERSAL'],
  ] as const)('classifies %s as %s without posting it', (message, kind) => {
    expect(interpretFinancialText(message, 'PASTED_TEXT')?.kind).toBe(kind);
  });

  it('keeps ambiguous amounts and currencies incomplete', () => {
    expect(interpretFinancialText('Compra COP 20.000 y COP 30.000', 'IMAGE')).toMatchObject({
      kind: 'EXPENSE',
      amount: undefined,
      confidence: 'LOW',
    });
    expect(interpretFinancialText('Compra $ 45.000 en Café', 'PDF')).toMatchObject({
      amount: '45000',
      currency: undefined,
    });
  });

  it('rejects authentication content and unrelated messages', () => {
    expect(interpretFinancialText('Tu código OTP 123456 para compra COP 50.000', 'SHARED_TEXT')).toBeNull();
    expect(interpretFinancialText('Inicia sesión en https://banco.co para verificar pago', 'NOTIFICATION')).toBeNull();
    expect(interpretFinancialText('Oferta de ahorro esta semana', 'SHARED_TEXT')).toBeNull();
  });

  it('does not return a card number, account number, or invalid date', () => {
    const movement = interpretFinancialText('Compra COP 10.000 en cuenta 12345678 el 31/02/2026', 'IMAGE');
    expect(movement?.description).toBeUndefined();
    expect(movement?.effectiveDate).toBeUndefined();
    expect(JSON.stringify(movement)).not.toContain('12345678');
  });

  it('warns about possible self-transfers and reversals', () => {
    expect(interpretFinancialText('Transferencia COP 10.000', 'PASTED_TEXT')?.warnings.join(' ')).toContain('propias cuentas');
    expect(interpretFinancialText('Reverso COP 10.000', 'PASTED_TEXT')?.warnings.join(' ')).toContain('original');
  });
});
