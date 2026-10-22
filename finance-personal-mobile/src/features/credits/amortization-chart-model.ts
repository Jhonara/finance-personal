import type { AmortizationRow } from './amortization-api';

type Point = { installment: number; balance: number };
const valid = (row: AmortizationRow) =>
  Number.isFinite(row.installment) && Number.isFinite(row.endingBalance) && row.endingBalance! >= 0;

// Plot server balances only; missing rows break a line instead of inventing values.
export function amortizationPlot(
  currentBalance: number,
  baseline: AmortizationRow[],
  scenario: AmortizationRow[],
) {
  const validRows = [...baseline, ...scenario].filter(valid);
  if (!validRows.length || !Number.isFinite(currentBalance) || currentBalance < 0) return null;
  const first = Math.min(...validRows.map((row) => row.installment!)) - 1;
  const last = Math.max(...validRows.map((row) => row.installment!));
  const maximum = Math.max(1, currentBalance, ...validRows.map((row) => row.endingBalance!));
  const x = (installment: number) => 52 + ((installment - first) / Math.max(1, last - first)) * 258;
  const y = (balance: number) => 160 - (balance / maximum) * 144;
  const series = (rows: AmortizationRow[]) => {
    const segments: Point[][] = [[{ installment: first, balance: currentBalance }]];
    for (const row of rows) {
      if (!valid(row)) {
        segments.push([]);
        continue;
      }
      const segment = segments[segments.length - 1]!;
      const previous = segment.at(-1);
      if (previous && row.installment! !== previous.installment + 1) segments.push([]);
      segments[segments.length - 1]!.push({ installment: row.installment!, balance: row.endingBalance! });
    }
    return segments
      .filter((points) => points.length > 1)
      .map((points) => {
        const coordinates = points.map((point) => ({ x: x(point.installment), y: y(point.balance) }));
        return {
          d: coordinates.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' '),
          length: coordinates.reduce((length, point, index) => {
            const previous = coordinates[index - 1];
            return length + (previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0);
          }, 0),
        };
      });
  };
  return { baseline: series(baseline), scenario: series(scenario), maximum, last, y };
}
