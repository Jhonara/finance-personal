import { describe, expect, it } from 'vitest';
import { homeColumns, homePlan } from './home-plan';

const period = { year: 2026, month: 9 };
describe('Home plan summaries', () => {
  it('uses functional copy when data is unavailable', () => {
    expect(homePlan({}, period)).toEqual({
      budget: 'Ver tus límites',
      budgetPercent: undefined,
      saving: 'Ver tus metas',
      savingPercent: undefined,
      credit: 'Ver tus créditos',
      alerts: 'Ver tus alertas',
      alertState: 'unknown',
    });
  });
  it.each([{ alerts: [] }, { alerts: [{ code: 'ALL_GOOD' }] }])(
    'only shows clear state with known alerts %#',
    ({ alerts }) => {
      expect(homePlan({ alerts }, period)).toMatchObject({ alerts: 'Sin avisos', alertState: 'clear' });
    },
  );
  it('does not imply everything is fine when alert codes are missing', () => {
    expect(homePlan({ alerts: [{}] }, period).alertState).toBe('unknown');
  });
  it('uses an attention state only for real alerts', () => {
    expect(homePlan({ alerts: [{ code: 'BUDGET_WARNING' }, { code: 'ALL_GOOD' }] }, period)).toMatchObject({
      alerts: '1 por revisar',
      alertState: 'attention',
    });
  });
  it('compacts the selected savings goal without changing backend progress', () => {
    expect(
      homePlan({ savings: [{ id: 1, name: 'Moto', progressPercent: 70, completed: false }] }, period).saving,
    ).toBe('Moto · 70%');
  });
  it('distinguishes important alerts from warnings', () => {
    expect(
      homePlan({ alerts: [{ code: 'BUDGET_EXCEEDED' }, { code: 'BUDGET_WARNING' }] }, period).alertState,
    ).toBe('important');
    expect(homePlan({ alerts: [{ code: 'BUDGET_WARNING' }] }, period).alertState).toBe('attention');
  });
  it('rejects budget percentages from a different period', () => {
    expect(
      homePlan({ budgets: { overallPercentage: 38, items: [{ year: 2026, month: 8 }] } }, period).budget,
    ).toBe('Ver tus límites');
  });
  it('keeps exact backend percentage precision useful for small progress', () => {
    expect(homePlan({ budgets: { overallPercentage: 2.6, items: [{ ...period }] } }, period).budget).toBe(
      '2,6% utilizado',
    );
  });
  it.each([
    [320, 1, 2],
    [360, 1, 2],
    [412, 1, 2],
    [320, 1.3, 1],
    [360, 1.3, 1],
    [412, 1.3, 2],
  ])('fits %s dp with font scale %s into %s columns', (width, scale, columns) => {
    expect(homeColumns(width, scale)).toBe(columns);
  });
});
