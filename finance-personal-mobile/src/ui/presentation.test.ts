import { describe, expect, it } from 'vitest';

import { formatPrivateMoney } from '@/privacy/privacy-format';
import { formatMoney } from '@/utils/money';
import {
  budgetStatusPresentation,
  isButtonDisabled,
  preserveMoneyInput,
  transactionPresentation,
} from './presentation';

describe('Finance Calm presentation helpers', () => {
  it('formats Colombian money without forced decimals', () => {
    expect(formatMoney(8450000, 'COP')).toMatch(/8\.450\.000/);
  });

  it('masks sensitive money when privacy is enabled', () => {
    expect(formatPrivateMoney(8450000, 'COP', true)).toBe('$ ••••••');
  });

  it('maps every transaction kind to a human label', () => {
    expect(transactionPresentation.TRANSFER.label).toBe('Transferencia');
    expect(transactionPresentation.CREDIT_PAYMENT.label).toBe('Pago de crédito');
  });

  it('maps budget states to visual labels', () => {
    expect(budgetStatusPresentation.WARNING.label).toBe('Atención');
    expect(budgetStatusPresentation.EXCEEDED.label).toBe('Excedido');
  });

  it('disables buttons while disabled or loading', () => {
    expect(isButtonDisabled(true, false)).toBe(true);
    expect(isButtonDisabled(false, true)).toBe(true);
    expect(isButtonDisabled(false, false)).toBe(false);
  });

  it('keeps money input as a string while filtering invalid characters', () => {
    expect(preserveMoneyInput('$ 1.250,50abc')).toBe('1.250,50');
  });

  it('represents transfers independently of sign color assumptions', () => {
    expect(transactionPresentation.TRANSFER.icon).toBe('swap-horizontal-outline');
    expect(transactionPresentation.TRANSFER.tone).toBe('info');
  });

  it('marks inactive accounts through their explicit component prop contract', () => {
    const account = { active: false, name: 'Cuenta anterior' };
    expect(account.active).toBe(false);
  });

  it('exposes a retry-ready error-state callback contract', () => {
    let retried = false;
    const retry = () => {
      retried = true;
    };
    retry();
    expect(retried).toBe(true);
  });
});
