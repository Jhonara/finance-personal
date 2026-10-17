import { describe, expect, it } from 'vitest';
import type { DashboardMonth } from '@/api/dashboard-api';
import { homePriorityHighlight, parseHomePriority, priorityShortcuts } from './home-priority';

const period = { year: 2026, month: 10 };
describe('Home priorities', () => {
  it('keeps every module available and restores the familiar order in general view', () => {
    expect(priorityShortcuts.general).toEqual(['budgets', 'savings', 'credits', 'reports']);
    expect(priorityShortcuts.debt[0]).toBe('credits');
    expect(priorityShortcuts.savings[0]).toBe('savings');
    for (const order of Object.values(priorityShortcuts))
      expect([...order].sort()).toEqual([...priorityShortcuts.general].sort());
    expect(homePriorityHighlight('general', {}, period)).toBeUndefined();
    expect(parseHomePriority('unknown-future-setting')).toBe('general');
  });
  it('uses the supplied current budget period, without inferring available cash', () => {
    const model = homePriorityHighlight(
      'expenses',
      {
        assetsByCurrency: { COP: 3000000, USD: 100 },
        budgets: { overallPercentage: 42, items: [{ ...period, status: 'OK' }] },
      },
      period,
    )!;
    expect(model.percentage).toBe(42);
    expect(model.destination).toEqual({ pathname: '/(app)/budgets', params: period });
    expect(JSON.stringify(model)).not.toContain('3000000');
    expect(
      homePriorityHighlight(
        'expenses',
        { budgets: { overallPercentage: 42, items: [{ year: 2026, month: 9 }] } },
        period,
      )?.percentage,
    ).toBeUndefined();
  });
  it('prioritizes a recorded late credit over an upcoming one without offering a payment submission', () => {
    const data: DashboardMonth = {
      credits: [
        { id: 1, name: 'Moto', status: 'ACTIVE', nextPaymentDate: '2026-10-20' },
        { id: 2, name: 'Casa', status: 'LATE', nextPaymentDate: '2026-11-03' },
        { id: 3, name: 'Pagado', status: 'PAID' },
      ],
    };
    const model = homePriorityHighlight('debt', data, period)!;
    expect(model.title).toBe('Casa');
    expect(model.description).toContain('según tus registros');
    expect(model.destination).toEqual({ pathname: '/(app)/credit-detail', params: { id: 2 } });
    expect(data.credits?.[0]?.name).toBe('Moto');
  });
  it('selects the earliest upcoming plan date and ignores paid credits', () => {
    const model = homePriorityHighlight(
      'debt',
      {
        credits: [
          { id: 1, name: 'Más tarde', status: 'ACTIVE', nextPaymentDate: '2026-12-01' },
          { id: 2, name: 'Antes', status: 'ACTIVE', nextPaymentDate: '2026-11-06' },
          { id: 3, name: 'Pagado', status: 'PAID', nextPaymentDate: '2026-10-01' },
        ],
      },
      period,
    )!;
    expect(model.title).toBe('Antes');
    expect(model.description).toContain('6 de noviembre de 2026');
    expect(homePriorityHighlight('debt', {}, period)?.destination).toBe('/(app)/credits');
  });
  it('highlights a real goal with server progress, without adding different currencies', () => {
    const model = homePriorityHighlight(
      'savings',
      {
        savings: [
          { id: 1, name: 'Viaje', progressPercent: 60, currency: 'USD' },
          { id: 2, name: 'Estudios', progressPercent: 30, currency: 'COP' },
          { id: 3, name: 'Terminada', completed: true, progressPercent: 100 },
        ],
      },
      period,
    )!;
    expect(model.title).toContain('Viaje');
    expect(model.percentage).toBe(60);
    expect(model.destination).toEqual({ pathname: '/(app)/saving-detail', params: { id: 1 } });
    expect(homePriorityHighlight('savings', {}, period)?.destination).toBe('/(app)/savings');
  });
});
