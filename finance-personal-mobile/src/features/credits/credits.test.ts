import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => storage.get(key),
  setItemAsync: async (key: string, value: string) => {
    storage.set(key, value);
  },
}));
import {
  creditGroups,
  creditLabel,
  creditMoney,
  creditProgress,
  creditStatus,
  creditSummary,
  linkedCreditAlerts,
  planRows,
  simulationRows,
} from './credit-presentation';
import { createCreditSchema, paymentSchema, simulationRequest, simulationSchema } from './credit-schemas';
import { claimCreditPaid } from './credit-paid';
import { alreadyReversed } from './use-credit-submit';
import { ApiError } from '@/api/errors';

const terms = {
  name: 'Vehículo',
  principal: '1000',
  annualRate: '0',
  termMonths: '12',
  paymentDay: '31',
  disbursementDate: '2026-01-01',
  currency: 'COP',
};
describe('Credit contract presentation', () => {
  it.each([
    ['ACTIVE', 'Activo'],
    ['LATE', 'Atrasado'],
    ['PAID', 'Pagado'],
  ] as const)('translates %s', (status, label) => expect(creditStatus(status)).toBe(label));
  it('uses explicit paid capital, independently of outstanding or interest', () => {
    expect(
      creditProgress({ principal: 1000, paidPrincipal: 250, remainingBalance: 900, paidInterest: 500 }),
    ).toBe(25);
    expect(creditProgress({ principal: 1000, remainingBalance: 500 })).toBeUndefined();
    expect(creditProgress({ principal: 0, paidPrincipal: 0 })).toBeUndefined();
    expect(creditProgress({ principal: 100, paidPrincipal: 110 })).toBeUndefined();
  });
  it('sums exact decimals within each currency', () =>
    expect(
      creditSummary([
        { currency: 'COP', remainingBalance: 0.1, status: 'ACTIVE' },
        { currency: 'COP', remainingBalance: 0.2, status: 'LATE' },
        { currency: 'USD', remainingBalance: 20, status: 'ACTIVE' },
      ]),
    ).toEqual([
      { currency: 'COP', total: '0.3', active: 2 },
      { currency: 'USD', total: '20', active: 1 },
    ]));
  it('does not present partial or unknown-currency totals', () => {
    expect(
      creditSummary([{ currency: 'COP', remainingBalance: 20 }, { currency: 'COP' }])[0]?.total,
    ).toBeUndefined();
    expect(creditSummary([{ remainingBalance: 20 }])[0]?.total).toBeUndefined();
    expect(creditMoney(undefined, 'COP', false)).toBe('No disponible');
  });
  it('groups without changing backend order', () =>
    expect(
      creditGroups([
        { id: 3, status: 'LATE' },
        { id: 8, status: 'ACTIVE' },
        { id: 2, status: 'ACTIVE' },
        { id: 4, status: 'PAID' },
      ]).map((g) => g.credits.map((c) => c.id)),
    ).toEqual([[8, 2], [3], [4]]));
  it('masks accessibility money while retaining rate and status', () => {
    const label = creditLabel(
      { name: 'Vehículo', remainingBalance: 12345, currency: 'COP', annualRate: 18.4, status: 'ACTIVE' },
      true,
    );
    expect(label).toContain('•••••• COP');
    expect(label).not.toContain('12345');
    expect(label).toContain('18.4');
    expect(label).toContain('Activo');
  });
  it('accepts only explicitly linked backend credit alerts', () =>
    expect(
      linkedCreditAlerts(
        [
          { code: 'HIGH_INTEREST', data: { creditId: 1 } },
          { code: 'HIGH_INTEREST', data: { creditId: 2 } },
          { code: 'CREDIT_BEHIND', message: 'crédito #1' },
        ],
        1,
      ),
    ).toHaveLength(1));
  it('omits unsupported plan and scenario values, retains zero', () => {
    expect(planRows({ plannedTotalToDate: 0, realTotalPaid: 10 })).toEqual([
      { label: 'Total pagado', planned: 0, real: 10, money: true },
    ]);
    expect(simulationRows({ savedInstallments: 0 })).toEqual([
      { label: 'Cuotas ahorradas', value: 0, money: false },
    ]);
    expect(simulationRows({})).toEqual([]);
  });
});
describe('Credit requests', () => {
  it('accepts zero EA and optional-account omission', () =>
    expect(createCreditSchema.safeParse(terms).success).toBe(true));
  it.each([
    { principal: '0' },
    { principal: '1.001' },
    { annualRate: '-1' },
    { termMonths: '0' },
    { paymentDay: '32' },
    { disbursementDate: '2026-02-30' },
    { currency: 'cop' },
  ])('rejects invalid terms %j', (invalid) =>
    expect(createCreditSchema.safeParse({ ...terms, ...invalid }).success).toBe(false),
  );
  it('accepts positive payment with extra as a part of the total', () =>
    expect(
      paymentSchema.safeParse({ amount: '100', extraPrincipalAmount: '30', paymentDate: '2026-01-01' })
        .success,
    ).toBe(true));
  it('rejects extra above total and future payments', () => {
    expect(
      paymentSchema.safeParse({ amount: '100', extraPrincipalAmount: '101', paymentDate: '2026-01-01' })
        .success,
    ).toBe(false);
    expect(
      paymentSchema.safeParse({ amount: '100', extraPrincipalAmount: '', paymentDate: '9999-01-01' }).success,
    ).toBe(false);
  });
  it('sends only backend scenario fields including extra by installment', () => {
    const result = simulationSchema.parse({
      ...terms,
      annualRate: '18,4',
      currentInstallment: '2',
      today: '2026-09-14',
      extraAmount: '100.25',
      extraInstallment: '4',
    });
    expect(simulationRequest(result)).toEqual({
      principal: 1000,
      annualRate: 18.4,
      termMonths: 12,
      paymentDay: 31,
      disbursementDate: '2026-01-01',
      currentInstallment: 2,
      today: '2026-09-14',
      extraPayments: { '4': 100.25 },
    });
  });
  it('rejects extra installment outside the term', () =>
    expect(
      simulationSchema.safeParse({
        ...terms,
        currentInstallment: '',
        today: '2026-01-01',
        extraAmount: '100',
        extraInstallment: '13',
      }).success,
    ).toBe(false));
  it('distinguishes already reversed from other conflicts and errors', () => {
    expect(alreadyReversed(new ApiError('El pago ya fue revertido', 409, null, null, null, {}))).toBe(true);
    expect(alreadyReversed(new ApiError('Otro conflicto', 409, null, null, null, {}))).toBe(false);
    expect(alreadyReversed(new Error('offline'))).toBe(false);
  });
});
describe('Paid milestone persistence', () => {
  beforeEach(() => storage.clear());
  it('recognizes a transition once, also under simultaneous claims', async () => {
    expect(
      await Promise.all([claimCreditPaid(1, 2, 'ACTIVE', 'PAID'), claimCreditPaid(1, 2, 'LATE', 'PAID')]),
    ).toEqual([true, false]);
    expect(await claimCreditPaid(1, 2, 'ACTIVE', 'PAID')).toBe(false);
  });
  it('isolates users and credits', async () => {
    expect(await claimCreditPaid(1, 2, 'ACTIVE', 'PAID')).toBe(true);
    expect(await claimCreditPaid(2, 2, 'ACTIVE', 'PAID')).toBe(true);
    expect(await claimCreditPaid(1, 3, 'ACTIVE', 'PAID')).toBe(true);
  });
  it('does not celebrate historical paid records, visits, or unpaid transitions', async () => {
    expect(await claimCreditPaid(1, 1, undefined, 'PAID')).toBe(false);
    expect(await claimCreditPaid(1, 1, 'PAID', 'PAID')).toBe(false);
    expect(await claimCreditPaid(1, 1, 'ACTIVE', 'LATE')).toBe(false);
    expect(storage.size).toBe(0);
  });
});
