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
    expect(
      interpretFinancialText('Inicia sesión en https://banco.co para verificar pago', 'NOTIFICATION'),
    ).toBeNull();
    expect(interpretFinancialText('Oferta de ahorro esta semana', 'SHARED_TEXT')).toBeNull();
  });

  it('does not return a card number, account number, or invalid date', () => {
    const movement = interpretFinancialText('Compra COP 10.000 en cuenta 12345678 el 31/02/2026', 'IMAGE');
    expect(movement?.description).toBeUndefined();
    expect(movement?.effectiveDate).toBeUndefined();
    expect(JSON.stringify(movement)).not.toContain('12345678');
  });

  it('warns about possible self-transfers and reversals', () => {
    expect(interpretFinancialText('Transferencia COP 10.000', 'PASTED_TEXT')?.warnings.join(' ')).toContain(
      'propias cuentas',
    );
    expect(interpretFinancialText('Reverso COP 10.000', 'PASTED_TEXT')?.warnings.join(' ')).toContain(
      'original',
    );
  });

  it('normalizes optional evidence and groups the same possible movement across sources', () => {
    const message =
      'Bancolombia: Compraste COP 55.000 en Café el 25/10/2026 a las 09:45 con tarjeta ****1234. Ref: ABC12345';
    const sms = interpretFinancialText(message, 'SHARED_TEXT');
    const image = interpretFinancialText(message, 'IMAGE');
    expect(sms).toMatchObject({
      institution: 'Bancolombia',
      accountHint: '1234',
      reference: 'ABC12345',
      occurredAt: '2026-10-25T09:45:00',
      counterparty: 'Café',
    });
    expect(sms?.dedupId).toBe(image?.dedupId);
    expect(sms?.dedupId).toMatch(/^possible-[0-9a-f]{8}$/);
  });

  it.each(['IMAGE', 'PDF'] as const)('reads a Colombian dataphone voucher from %s', (source) => {
    const text = [
      'Redeban',
      'OCT 24 2026 19:30:32 NOV-11.61',
      'MERCAFRUVER EL CAMPESTINO',
      'TV 28E 72F3',
      'MASTERCARD **4025',
      'VENTA',
      'COMPRA NETA $ 78.300',
      'IVA $ 0',
      'INC $ 0',
      'TOTAL $ 78.300',
      'PAGO SIN CONTACTO',
    ].join('\n');

    expect(interpretFinancialText(text, source)).toMatchObject({
      kind: 'EXPENSE',
      amount: '78300',
      currency: 'COP',
      effectiveDate: '2026-10-24',
      occurredAt: '2026-10-24T19:30:00',
      description: 'MERCAFRUVER EL CAMPESTINO',
      confidence: 'HIGH',
      source,
    });
  });

  it.each(['IMAGE', 'PDF'] as const)(
    'reads the total and date from an itemized Colombian invoice via %s',
    (source) => {
      const text = [
        'MERCAFRUVER EL CAMPESINO',
        'NIT: 105884244-3',
        'Sede: Principal',
        'Calle 72f3 no.28e-05 barrio Calipso',
        '24/10/2026 19:30',
        'No. BVO-50431',
        'CHOCORAMO *65G x 1 $ 3.000',
        'LECHE SANFERNANDO $ 5.900',
        'CARNES x 1 $ 38.200',
        'Subtotal $ 78.300',
        'Total venta $ 78.300',
        'Tipo de pago · Tarjeta débito',
      ].join('\n');

      expect(interpretFinancialText(text, source)).toMatchObject({
        kind: 'EXPENSE',
        amount: '78300',
        currency: 'COP',
        effectiveDate: '2026-10-24',
        occurredAt: '2026-10-24T19:30:00',
        description: 'MERCAFRUVER EL CAMPESINO',
        confidence: 'HIGH',
        source,
      });
    },
  );

  it('uses the final total on a long receipt page and refuses conflicting totals', () => {
    const longReceipt = [
      'MERCAFRUVER EL CAMPESINO',
      'NIT 105884244-3',
      '24/10/2026',
      ...Array.from({ length: 500 }, (_, index) => `PRODUCTO ${index + 1} $ 1.000`),
      'Subtotal $ 500.000',
      'Total venta $ 500.000',
    ].join('\n');
    expect(interpretFinancialText(longReceipt, 'PDF')).toMatchObject({
      kind: 'EXPENSE',
      amount: '500000',
      effectiveDate: '2026-10-24',
    });

    expect(
      interpretFinancialText('REDEBAN\nMERCAFRUVER\n24/10/2026\nTOTAL $ 78.300\nTOTAL $ 87.300', 'IMAGE'),
    ).toMatchObject({ kind: 'EXPENSE', amount: undefined, confidence: 'LOW' });
  });

  it.each(['QA31 MERCADO DE PRUEBA', '7 ELEVEN', 'SUPER 99'])(
    'preserves short digits in merchant names such as %s without selecting currency metadata',
    (merchant) => {
      const receipt = [
        merchant,
        'NIT: 123456789-0',
        'Fecha: 31/10/2026',
        'Moneda: COP',
        'Total venta $ 78.300',
      ].join('\n');
      expect(interpretFinancialText(receipt, 'PDF')).toMatchObject({
        description: merchant,
        counterparty: merchant,
        amount: '78300',
        currency: 'COP',
        effectiveDate: '2026-10-31',
      });
    },
  );

  it('does not use currency metadata or long identifiers as a receipt merchant', () => {
    const receipt = [
      'NIT: 123456789-0',
      'Moneda: COP',
      'Currency USD',
      'COP',
      'Local 12345678',
      'Total venta $ 78.300',
    ].join('\n');
    expect(interpretFinancialText(receipt, 'PDF')?.description).toBeUndefined();
  });

  it('prefers the merchant above the tax identifier over a misread decorative logo', () => {
    const receipt = [
      '&AMPESND',
      'MERCAFRUVER EL CAMPESINO',
      'NIT: 123456789-0',
      'Sede: Principal',
      '24/10/2026 19:30',
      'Subtotal $ 78.300',
      'Total venta $ 78.300',
      'Tipo de pago Tarjeta débito',
    ].join('\n');
    expect(interpretFinancialText(receipt, 'IMAGE')).toMatchObject({
      description: 'MERCAFRUVER EL CAMPESINO',
      amount: '78300',
      currency: 'COP',
      effectiveDate: '2026-10-24',
    });
  });
});

describe('Receipt total robustness', () => {
  it.each(['IMAGE', 'PDF'] as const)(
    'ignores tax and change totals while joining split numeric separators in %s',
    (source) => {
      const receipt =
        'TIENDA DEL BARRIO\nNIT 123456789-0\n31/10/2026\nIVA $ 5.000\nTOTAL IVA $ 5.000\nTOTAL $ 78. 300, 00\nEFECTIVO $ 100.000\nCAMBIO $ 21.700';
      expect(interpretFinancialText(receipt, source)).toMatchObject({ amount: '78300.00', currency: 'COP' });
    },
  );
  it('does not use a subtotal or a following tax line as an unreadable final total', () => {
    expect(
      interpretFinancialText(
        'TIENDA CENTRAL\nNIT 123456789-0\n31/10/2026\nSUBTOTAL $ 20.000\nTOTAL\nIVA $ 1.000',
        'IMAGE',
      )?.amount,
    ).toBeUndefined();
  });
  it('keeps conflicting currencies and totals incomplete for review', () => {
    expect(
      interpretFinancialText('REDEBAN\nTIENDA CENTRAL\n31/10/2026\nTOTAL COP 80.000\nTOTAL USD 20', 'PDF'),
    ).toMatchObject({ amount: undefined, currency: undefined, confidence: 'LOW' });
  });
  it('does not suggest a cancelled voucher as a new expense', () => {
    const result = interpretFinancialText(
      'REDEBAN\nTIENDA CENTRAL\n31/10/2026\nANULACIÓN DE COMPRA\nTOTAL $ 78.300',
      'IMAGE',
    );
    expect(result).toMatchObject({ kind: 'REVERSAL', amount: '78300' });
    expect(result?.warnings.join(' ')).toContain('original');
  });
});

it.each(['Bancolombia', 'Davivienda', 'Nequi', 'BBVA', 'Daviplata', 'Nu Colombia'])(
  'reads a synthetic %s notification with explicit COP, dollar sign and ISO year-first date',
  (bank) => {
    expect(
      interpretFinancialText(
        `${bank}: Compraste COP $ 18.250,00 en Café el 2026/10/31. Saldo disponible COP $ 1.000.000`,
        'NOTIFICATION',
      ),
    ).toMatchObject({ kind: 'EXPENSE', currency: 'COP', amount: '18250.00', effectiveDate: '2026-10-31' });
  },
);
it('accepts invoice QR identifiers while still rejecting authentication codes on the same receipt', () => {
  const receipt =
    'TIENDA CENTRAL\nFACTURA DIAN\nCódigo QR 123456789\nNIT 123456789-0\nFecha 2026/10/31\nTOTAL COP $ 78 . 300, 00';
  expect(interpretFinancialText(receipt, 'PDF')).toMatchObject({
    amount: '78300.00',
    currency: 'COP',
    effectiveDate: '2026-10-31',
  });
  expect(interpretFinancialText(receipt + '\nCódigo OTP de seguridad 123456', 'PDF')).toBeNull();
});
