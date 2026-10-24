import { describe, expect, it } from 'vitest';
import { parsePurchaseText } from './purchase-parser';

describe('Voluntary local purchase suggestions', () => {
  it('extracts a Colombian purchase without storing the original text or card', () => {
    expect(
      parsePurchaseText('Compraste COP 85.000,50 en MERCADO CENTRAL el 23/10/2026 con tarjeta 1234.'),
    ).toEqual({
      kind: 'EXPENSE',
      amount: '85000.50',
      currency: 'COP',
      description: 'MERCADO CENTRAL',
      effectiveDate: '2026-10-23',
    });
  });
  it('leaves multiple amounts, missing dates and ambiguous currency for review', () => {
    const multiple = parsePurchaseText('Compraste COP 50.000. Saldo COP 100.000');
    expect(multiple.amount).toBe('');
    expect(multiple.effectiveDate).toBe('');
    expect(parsePurchaseText('Compra $ 45.000 en Café').currency).toBe('');
    expect(parsePurchaseText('Compra USD 1.234 en Café').amount).toBe('');
    expect(parsePurchaseText('Compra COP 20.00.50 en Café').amount).toBe('');
  });
  it('handles dollars and rejects impossible calendar dates', () => {
    expect(parsePurchaseText('Compra US$ 1,234.50 en Tienda el 2026-10-23')).toMatchObject({
      currency: 'USD',
      amount: '1234.50',
      effectiveDate: '2026-10-23',
    });
    expect(parsePurchaseText('Compra COP 10.000 el 31/02/2026').effectiveDate).toBe('');
  });
  it.each([
    'Pagaste cuota crédito COP 50.000',
    'Transferiste COP 50.000',
    'Recibiste salario COP 1.000.000',
    'Tu código OTP 123456',
  ])('does not classify %s as an ordinary purchase', (text) => {
    expect(parsePurchaseText(text).kind).toBe('OTHER');
  });
  it('does not extract account details as a merchant', () => {
    expect(parsePurchaseText('Compra COP 10.000 en cuenta 12345678').description).toBe('');
  });
});
