import React from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(
  () =>
    (name: string) =>
    ({ children, ...props }: React.PropsWithChildren) =>
      React.createElement(name, props, children),
);
const options = vi.hoisted(() => ({ reduced: false, width: 360 }));
vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  Platform: { select: (values: Record<string, unknown>) => values.default },
  useWindowDimensions: () => ({ width: options.width, height: 740 }),
}));
vi.mock('react-native-gifted-charts', () => ({ LineChart: host('GiftedLineChart') }));
vi.mock('@/ui/motion', () => ({ MotionPressable: host('Pressable') }));
vi.mock('@/ui/use-reduced-motion', () => ({ useReducedMotion: () => options.reduced }));
vi.mock('./report-charts', () => ({ ReportTrend: host('ReportTrend') }));
vi.mock('./report-ui', () => ({
  reportStyles: {},
  ReportNotice: host('Notice'),
  ReportChoice: ({
    choices,
    onSelect,
  }: {
    choices: { value: string; label: string }[];
    onSelect: (value: string) => void;
  }) =>
    React.createElement(
      'Choice',
      undefined,
      ...choices.map((choice) =>
        React.createElement('Pressable', {
          key: choice.value,
          accessibilityLabel: choice.label,
          onPress: () => onSelect(choice.value),
        }),
      ),
    ),
}));
import { historyScale, InteractiveHistory } from './interactive-history';
import type { TrendPoint } from './report-model';

const text = (node: ReactTestInstance): string =>
  node.children.map((child) => (typeof child === 'string' ? child : text(child))).join('');
const series: TrendPoint[] = [
  { year: 2026, month: 8, income: 4000000, expense: 0 },
  { year: 2026, month: 9, income: 0, expense: -120000 },
  { year: 2026, month: 10, income: 9000000, expense: 500000 },
];
let tree: ReturnType<typeof create> | undefined;

async function render(points: TrendPoint[] = series, hidden = false) {
  await act(async () => {
    tree = create(<InteractiveHistory points={points} currency="COP" hidden={hidden} />);
  });
  return tree!;
}
async function press(label: string) {
  const target = tree!.root
    .findAllByType('Pressable' as never)
    .find((node) => node.props.accessibilityLabel === label);
  expect(target, label).toBeDefined();
  await act(async () => target!.props.onPress());
}
const chart = () => tree!.root.findByType('GiftedLineChart' as never);
const selectedMonth = () =>
  tree!.root.findAllByType('Pressable' as never).find((node) => node.props.accessibilityState?.selected)
    ?.props.accessibilityLabel;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  options.reduced = false;
  options.width = 360;
});
afterEach(async () => {
  if (tree) await act(async () => tree?.unmount());
  tree = undefined;
});

describe('interactive financial history', () => {
  it('passes both actual series to the line chart without dropping zero or changing a refund sign', async () => {
    const rendered = await render();
    expect(rendered.root.findByType('ReportTrend' as never).props.points).toEqual(series);
    await press('Ver tendencia');
    const props = chart().props;
    expect(props.data.map((entry: { value: number }) => entry.value)).toEqual([4000000, 0, 9000000]);
    expect(props.data2.map((entry: { value: number }) => entry.value)).toEqual([0, -120000, 500000]);
    expect(props.noOfSectionsBelowXAxis).toBe(4);
    expect(props.mostNegativeValue).toBe(-props.maxValue);
    expect(props.maxValue).toBeGreaterThanOrEqual(9000000);
    expect(rendered.root.findAllByType('ReportTrend' as never)).toHaveLength(0);
  });

  it('falls back to columns for unavailable data and keeps undefined distinct from a successful zero', async () => {
    const incomplete = series.map((point, index) => (index === 1 ? { ...point, income: undefined } : point));
    const rendered = await render(incomplete);
    await press('Ver tendencia');
    expect(rendered.root.findAllByType('GiftedLineChart' as never)).toHaveLength(0);
    expect(rendered.root.findByType('ReportTrend' as never).props.points).toEqual(incomplete);
    expect(rendered.root.findByType('ReportTrend' as never).props.points[1].income).toBeUndefined();
    expect(rendered.root.findByType('ReportTrend' as never).props.points[0].expense).toBe(0);
    expect(text(rendered.root)).toContain('sin unirlos con datos que no cargaron');
  });

  it('removes the chart and actual money when privacy is enabled after opening the trend', async () => {
    const rendered = await render();
    await press('Ver tendencia');
    expect(text(rendered.root)).toContain('9.000.000');
    await act(async () => rendered.update(<InteractiveHistory points={series} currency="COP" hidden />));
    expect(rendered.root.findAllByType('GiftedLineChart' as never)).toHaveLength(0);
    expect(rendered.root.findAllByType('ReportTrend' as never)).toHaveLength(0);
    expect(text(rendered.root)).toContain('Gráfica oculta');
    expect(text(rendered.root)).not.toContain('9.000.000');
    expect(text(rendered.root)).not.toContain('500.000');
  });

  it('selects the right month from income points, expense points, focus and accessible month buttons', async () => {
    const rendered = await render();
    await press('Ver tendencia');
    expect(selectedMonth()).toBe('Consultar Octubre de 2026');
    await act(async () => chart().props.data[0].onPress());
    expect(selectedMonth()).toBe('Consultar Agosto de 2026');
    expect(text(rendered.root)).toContain('4.000.000');
    await act(async () => chart().props.data2[1].onPress());
    expect(selectedMonth()).toBe('Consultar Septiembre de 2026');
    expect(text(rendered.root)).toMatch(/-\$\s120\.000/);
    await act(async () => chart().props.onFocus({}, 2));
    expect(selectedMonth()).toBe('Consultar Octubre de 2026');
    await press('Consultar Agosto de 2026');
    expect(selectedMonth()).toBe('Consultar Agosto de 2026');
    await press('Comparar meses');
    expect(rendered.root.findAllByType('GiftedLineChart' as never)).toHaveLength(0);
    expect(rendered.root.findByType('ReportTrend' as never).props.points).toEqual(series);
  });

  it('respects reduced motion and remains usable on a narrow phone', async () => {
    options.reduced = true;
    options.width = 280;
    await render();
    await press('Ver tendencia');
    expect(chart().props.isAnimated).toBe(false);
    expect(chart().props.width).toBeGreaterThanOrEqual(200);
    expect(chart().props.spacing).toBeGreaterThanOrEqual(46);
  });

  it('preserves the selected year and month when expanding six months to twelve and falls back when absent', async () => {
    const fullYear = Array.from({ length: 12 }, (_, index) => ({
      year: 2026,
      month: index + 1,
      income: (index + 1) * 100000,
      expense: (index + 1) * 10000,
    }));
    const rendered = await render(fullYear.slice(-6));
    await press('Ver tendencia');
    expect(selectedMonth()).toBe('Consultar Diciembre de 2026');
    await act(async () =>
      rendered.update(<InteractiveHistory points={fullYear} currency="COP" hidden={false} />),
    );
    expect(selectedMonth()).toBe('Consultar Diciembre de 2026');
    await press('Consultar Septiembre de 2026');
    await act(async () =>
      rendered.update(<InteractiveHistory points={fullYear.slice(-6)} currency="COP" hidden={false} />),
    );
    expect(selectedMonth()).toBe('Consultar Septiembre de 2026');
    await act(async () =>
      rendered.update(<InteractiveHistory points={fullYear.slice(-3)} currency="COP" hidden={false} />),
    );
    expect(selectedMonth()).toBe('Consultar Diciembre de 2026');
    await act(async () =>
      rendered.update(<InteractiveHistory points={fullYear} currency="COP" hidden={false} />),
    );
    expect(selectedMonth()).toBe('Consultar Diciembre de 2026');
  });

  it('shares the selected month between columns and lines in both directions', async () => {
    const rendered = await render();
    let columns = rendered.root.findByType('ReportTrend' as never);
    expect(columns.props.selectedMonth).toBe('2026-10');
    await act(async () => columns.props.onSelectMonth('2026-9'));
    await press('Ver tendencia');
    expect(selectedMonth()).toBe('Consultar Septiembre de 2026');
    await press('Consultar Agosto de 2026');
    await press('Comparar meses');
    columns = rendered.root.findByType('ReportTrend' as never);
    expect(columns.props.selectedMonth).toBe('2026-8');
    await act(async () => columns.props.onSelectMonth('2026-10'));
    await press('Ver tendencia');
    expect(selectedMonth()).toBe('Consultar Octubre de 2026');
  });
  it('opens the actual selected month behind the series instead of the current month', async () => {
    const open = vi.fn();
    await act(async () => {
      tree = create(<InteractiveHistory points={series} currency="COP" hidden={false} onOpenPeriod={open} />);
    });
    await act(async () => tree!.root.findByType('ReportTrend' as never).props.onSelectMonth('2026-8'));
    await press('Ver gastos de Agosto de 2026');
    expect(open).toHaveBeenCalledExactlyOnceWith('EXPENSE', series[0]);
  });
});

describe('history axis scale', () => {
  it.each([
    [],
    [{ year: 2026, month: 10, income: 0, expense: 0 }],
    [{ year: 2026, month: 10, income: 0.01, expense: -0.03 }],
    [{ year: 2026, month: 10, income: 1500000000000, expense: -500000000000 }],
    [{ year: 2026, month: 10, income: undefined, expense: Number.NaN }],
    [{ year: 2026, month: 10, income: Number.POSITIVE_INFINITY, expense: 1 }],
  ])('keeps empty, zero, signed and unavailable scales finite (%j)', (...entries) => {
    const points = entries as TrendPoint[];
    const scale = historyScale(points);
    expect(Number.isFinite(scale.step)).toBe(true);
    expect(Number.isFinite(scale.max)).toBe(true);
    expect(scale.step).toBeGreaterThan(0);
    expect(scale.max).toBe(scale.step * 4);
    expect([0, 4]).toContain(scale.below);
  });

  it('requires every observation to be available before drawing a connected line', () => {
    expect(historyScale(series).complete).toBe(true);
    expect(historyScale([]).complete).toBe(false);
    expect(historyScale([{ year: 2026, month: 10, income: 0 }]).complete).toBe(false);
    expect(historyScale([{ year: 2026, month: 10, income: 0, expense: 0 }]).complete).toBe(true);
    expect(historyScale([{ year: 2026, month: 10, income: Number.NaN, expense: 0 }]).complete).toBe(false);
  });
});
