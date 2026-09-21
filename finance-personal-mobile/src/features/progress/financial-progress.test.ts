import { describe, expect, it } from 'vitest';
import type { DashboardMonth } from '@/api/dashboard-api';
import { dashboardPeriodFromParams } from '@/features/dashboard/dashboard-period';
import { financialProgress } from './financial-progress';

const period = { year: 2026, month: 9 };
const flow: DashboardMonth = {
  totalIncome: 100,
  totalExpense: 40,
  netCashFlow: 60,
  accounts: [{ currency: 'COP' }],
};
const present = (dashboard?: DashboardMonth) => financialProgress({ dashboard, period });
describe('financial progress from available contracts', () => {
  it.each([
    [60, 'Este mes llevas flujo positivo'],
    [-60, 'Este mes tus salidas superan tus ingresos'],
    [0, 'Tu flujo del mes está equilibrado'],
  ])('presents flow %s without judging decisions', (amount, title) => {
    expect(present({ ...flow, totalExpense: 100 - Number(amount), netCashFlow: amount })[0]).toMatchObject({
      title,
      amount: { value: amount, currency: 'COP' },
      destination: { pathname: '/(app)/transactions', params: period },
    });
  });
  it.each([
    undefined,
    {},
    { netCashFlow: 0, totalIncome: 0, totalExpense: 0 },
    { ...flow, totalIncome: undefined },
    { ...flow, netCashFlow: NaN },
    { ...flow, accounts: [] },
    { ...flow, assetsByCurrency: { USD: 20 } },
  ])('omits insufficient or ambiguous flow %#', (data) => {
    expect(present(data)).toEqual([]);
  });
  it.each(['OK', 'WARNING', 'EXCEEDED'] as const)(
    'uses backend budget status %s and percentage',
    (status) => {
      const [signal] = present({ budgets: { overallPercentage: 38, items: [{ ...period, status }] } });
      expect(signal).toMatchObject({
        kind: 'budget',
        percentage: 38,
        title: status === 'OK' ? 'Dentro de lo planeado' : 'Una categoría necesita atención',
        destination: { pathname: '/(app)/budgets', params: period },
      });
      expect(signal!.accessibility).toContain('38 por ciento');
    },
  );
  it('rejects stale monthly budgets and unknown states', () => {
    expect(present({ budgets: { items: [{ year: 2026, month: 8, status: 'OK' }] } })).toEqual([]);
    expect(present({ budgets: { items: [{}] } })).toEqual([]);
  });
  it('chooses active saving with highest explicit progress, ties by id', () => {
    const [signal] = present({
      savings: [
        { id: 3, name: 'Casa', progressPercent: 81 },
        { id: 2, name: 'Moto', progressPercent: 81 },
        { id: 1, progressPercent: 100, completed: true },
        { id: 4, current: 50, target: 100 },
      ],
    });
    expect(signal).toMatchObject({
      title: 'Moto está al 81%',
      percentage: 81,
      destination: { pathname: '/(app)/saving-detail', params: { id: 2 } },
    });
    expect(signal!.accessibility).toBe('Meta Moto, 81 por ciento completada.');
  });
  it('keeps informational savings noninteractive without a safe id', () => {
    expect(present({ savings: [{ progressPercent: 20 }] })[0]!.destination).toBeUndefined();
  });
  it('does not derive paid capital from remaining debt or Dashboard snapshots', () => {
    expect(
      financialProgress({
        period,
        dashboard: { credits: [{ id: 1, principal: 100, remainingBalance: 20, status: 'ACTIVE' }] },
        cachedCredits: [{ id: 1, principal: 100, remainingBalance: 20, status: 'ACTIVE' }],
      }),
    ).toEqual([]);
  });
  it('uses explicit paid capital from a cached active credit', () => {
    expect(
      financialProgress({
        period,
        dashboard: {},
        cachedCredits: [{ id: 2, name: 'Casa', status: 'ACTIVE', principal: 1000, paidPrincipal: 270 }],
      })[0],
    ).toMatchObject({
      title: 'Has avanzado 27% en Casa',
      percentage: 27,
      destination: { pathname: '/(app)/credit-detail', params: { id: 2 } },
    });
  });
  it('caps signals at three in deterministic priority without mutating data', () => {
    const dashboard = {
      ...flow,
      budgets: { items: [{ status: 'OK' as const }] },
      savings: [{ id: 1, progressPercent: 20 }],
    };
    const before = JSON.stringify(dashboard);
    const signals = financialProgress({
      period,
      dashboard,
      cachedCredits: [{ principal: 100, paidPrincipal: 10, status: 'ACTIVE' }],
    });
    expect(signals.map((s) => s.kind)).toEqual(['flow', 'budget', 'savings']);
    expect(JSON.stringify(dashboard)).toBe(before);
  });
  it('follows requested month for monthly labels and navigation', () => {
    const next = { year: 2026, month: 10 };
    const [signal] = financialProgress({ dashboard: flow, period: next });
    expect(signal!.eyebrow).toBe('Octubre de 2026');
    expect(signal!.destination?.params).toEqual(next);
  });
  it.each([
    ['2026', '9', period],
    ['2026', '13', undefined],
    [['2026'], '9', undefined],
    ['oops', '9', undefined],
    ['2026', '', undefined],
  ])('validates navigation period %#', (year, month, expected) => {
    expect(dashboardPeriodFromParams(year, month)).toEqual(expected);
  });
});
