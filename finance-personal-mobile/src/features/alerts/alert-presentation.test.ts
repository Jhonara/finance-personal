import { describe, expect, it } from 'vitest';
import { actionableAlerts, positiveId, presentAlert } from './alert-presentation';
import { profileInitials } from '@/features/profile/profile-presentation';

describe('Alert contract presentation', () => {
  it.each([
    ['ALL_GOOD', 'Información', 'Todo en orden'],
    ['BUDGET_WARNING', 'Atención', 'Presupuesto cerca del límite'],
    ['BUDGET_EXCEEDED', 'Importante', 'Presupuesto excedido'],
    ['CREDIT_BEHIND', 'Importante', 'Pago de crédito pendiente'],
    ['HIGH_INTEREST', 'Atención', 'Intereses por encima del plan'],
    ['OPPORTUNITY_PREPAY', 'Información', 'Podrías explorar un abono adicional'],
    ['SPEND_SPIKE', 'Atención', 'Gasto inusual'],
  ])('maps %s without changing backend severity', (code, level, title) => {
    const alert = { code, severity: 'WARNING' };
    expect(presentAlert(alert)).toMatchObject({ title, level });
    expect(alert.severity).toBe('WARNING');
  });
  it('uses contextual identity for seen and requires a real budget period for navigation', () => {
    expect(presentAlert({ code: 'BUDGET_WARNING', data: { budgetId: 3 } })).toMatchObject({
      seen: { code: 'BUDGET_WARNING', data: { relatedId: 3 } },
      target: undefined,
    });
    expect(
      presentAlert({ code: 'BUDGET_WARNING', data: { budgetId: 3, year: 2026, month: 9 } }).target,
    ).toEqual({ kind: 'budget', id: 3, year: 2026, month: 9 });
    expect(presentAlert({ code: 'CREDIT_BEHIND', data: { creditId: 4 } }).seen?.data).toEqual({
      relatedId: 4,
    });
  });
  it('keeps global spend spike global and never guesses a category', () => {
    expect(
      presentAlert({ code: 'SPEND_SPIKE', data: { categoryId: 3, differencePercent: 20 } }),
    ).toMatchObject({ seen: { code: 'SPEND_SPIKE', data: {} }, target: undefined });
  });
  it('does not infer IDs or invent actions for unknown alerts', () => {
    for (const id of ['2', 0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(positiveId(id)).toBeUndefined();
    expect(presentAlert({ code: 'CREDIT_BEHIND', data: { creditId: '4' } }).seen).toBeUndefined();
    expect(presentAlert({ code: 'FUTURE_CODE', message: 'Technical message 5000' })).toMatchObject({
      title: 'Aviso financiero',
      seen: undefined,
      target: undefined,
    });
  });
  it('never exposes untyped monetary messages or metadata in context', () => {
    const result = presentAlert({
      code: 'HIGH_INTEREST',
      message: 'Pagaste $123456',
      data: { creditId: 4, realInterest: 123456, plannedInterest: 98765, annualEffectiveRatePercent: 18 },
    });
    expect(JSON.stringify(result)).not.toContain('123456');
    expect(result.context).toContain('Tasa EA 18%');
  });
  it('excludes ALL_GOOD from active counts without losing real alerts', () => {
    expect(actionableAlerts([{ code: 'ALL_GOOD' }, { code: 'CREDIT_BEHIND' }])).toEqual([
      { code: 'CREDIT_BEHIND' },
    ]);
    expect(presentAlert({ code: 'ALL_GOOD' }).seen).toBeUndefined();
  });
});
describe('Profile initials', () => {
  it.each([
    ['Jhonatan Ramírez', 'JR'],
    ['Prueba', 'P'],
    ['  Ana   María Pérez ', 'AP'],
    ['', '?'],
    ['Érika Ñúñez', 'ÉÑ'],
  ])('derives %s safely', (name, expected) => expect(profileInitials(name)).toBe(expected));
});
