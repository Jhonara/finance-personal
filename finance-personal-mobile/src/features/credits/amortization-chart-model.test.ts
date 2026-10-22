import { describe, expect, it } from 'vitest';
import { amortizationPlot } from './amortization-chart-model';

describe('amortization comparison geometry', () => {
  it('aligns both plans to the same installments and leaves an early payoff at its actual date', () => {
    const plot = amortizationPlot(
      100,
      [
        { installment: 4, endingBalance: 50 },
        { installment: 5, endingBalance: 0 },
      ],
      [{ installment: 4, endingBalance: 0 }],
    )!;
    expect(plot.baseline[0]!.d).toBe('M52,16 L181,88 L310,160');
    expect(plot.scenario[0]!.d).toBe('M52,16 L181,160');
    expect(plot.last).toBe(5);
  });
  it('does not invent balances or connect across missing installments', () => {
    const plot = amortizationPlot(
      100,
      [
        { installment: 4, endingBalance: 90 },
        { installment: 5 },
        { installment: 6, endingBalance: 50 },
        { installment: 7, endingBalance: 0 },
      ],
      [],
    )!;
    expect(plot.baseline).toHaveLength(2);
    expect(plot.baseline[1]!.d.startsWith('M')).toBe(true);
    expect(amortizationPlot(100, [], [])).toBeNull();
    expect(amortizationPlot(NaN, [{ installment: 1, endingBalance: 0 }], [])).toBeNull();
  });
});
