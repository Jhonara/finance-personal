import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(
  () =>
    (name: string) =>
    ({ children, ...props }: React.PropsWithChildren) =>
      React.createElement(name, props, children),
);
vi.mock('react-native', () => ({
  View: host('View'),
  Text: host('Text'),
  ScrollView: host('ScrollView'),
  Platform: { select: (values: Record<string, unknown>) => values.default },
  useWindowDimensions: () => ({ width: 360, height: 740 }),
}));
vi.mock('react-native-reanimated', () => import('@/test/chart-reanimated'));
vi.mock('react-native-svg', () => ({
  default: host('Svg'),
  Circle: host('Circle'),
  G: host('G'),
  Line: host('Line'),
  Path: host('Path'),
  Rect: host('Rect'),
  Text: host('SvgText'),
}));
vi.mock('@/ui/motion', () => ({ MotionEntry: host('Entry'), MotionPressable: host('Pressable') }));
vi.mock('@/ui/chart-motion', () => ({
  useChartReveal: () => ({ value: 1 }),
  GrowingBar: host('GrowingBar'),
}));
vi.mock('./report-ui', () => ({ reportStyles: {}, ReportNotice: host('Notice') }));
import { ReportRing, ReportTrend } from './report-charts';
import { ringSegments } from './chart-geometry';

let tree: ReturnType<typeof create> | undefined;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(async () => {
  if (tree) await act(async () => tree?.unmount());
  tree = undefined;
});

describe('interactive report ring', () => {
  it('opens the correct stable category on every slice, including the small last category', async () => {
    const parts = [
      { key: 'market', name: 'Mercado', value: 200000, color: '#176F9C' },
      { key: 'school', name: 'Educación', value: 120000, color: '#A15C0A' },
      { key: 'food', name: 'Alimentación', value: 78000, color: '#7460B8' },
      { key: 'small', name: 'Comida', value: 10000, color: '#087B61' },
    ];
    const select = vi.fn();
    await act(async () => {
      tree = create(
        <ReportRing parts={parts} hidden={false} title="Por grupo" value="$408.000" onSelectKey={select} />,
      );
    });
    const hitSurface = tree!.root
      .findAllByType('Pressable' as never)
      .find((node) => node.props.testID === 'report-ring-hit-surface')!;
    for (const segment of ringSegments(parts)) {
      const angle = (segment.startAngle + segment.endAngle) / 2;
      await act(async () =>
        hitSurface.props.onPress({
          nativeEvent: { locationX: 104 + 84 * Math.sin(angle), locationY: 104 - 84 * Math.cos(angle) },
        }),
      );
      expect(select).toHaveBeenLastCalledWith(segment.key);
    }
    expect(tree!.root.findAllByType('Path' as never)).toHaveLength(4);
    expect(tree!.root.findAllByType('Path' as never).every((node) => !node.props.onPress)).toBe(true);
    select.mockClear();
    await act(async () => hitSurface.props.onPress({ nativeEvent: { locationX: 104, locationY: 104 } }));
    expect(select).not.toHaveBeenCalled();
  });

  it('provides a large accessible legend target for a subpixel slice and does not leak data while hidden', async () => {
    const select = vi.fn();
    const parts = [
      { key: 'large', name: 'Grande', value: 1000000, color: '#176F9C' },
      { key: 'tiny', name: 'Pequeña', value: 1, color: '#A15C0A' },
    ];
    await act(async () => {
      tree = create(
        <ReportRing parts={parts} hidden={false} title="Grupo" value="$1.000.001" onSelectKey={select} />,
      );
    });
    const target = tree!.root
      .findAllByType('Pressable' as never)
      .find((node) => node.props.accessibilityLabel?.startsWith('Pequeña:'))!;
    expect(target.props.accessibilityLabel).toContain('<0,1%');
    await act(async () => target.props.onPress());
    expect(select).toHaveBeenCalledWith('tiny');
    await act(async () =>
      tree!.update(<ReportRing parts={parts} hidden title="Grupo" value="••••" onSelectKey={select} />),
    );
    expect(tree!.root.findAllByType('Svg' as never)).toHaveLength(0);
    expect(tree!.root.findAllByType('Pressable' as never)).toHaveLength(0);
  });
});

describe('monthly column selection', () => {
  it('accepts controlled month selection and reports the actual year-month on a column press', async () => {
    const points = [
      { year: 2025, month: 12, income: 100, expense: 20 },
      { year: 2026, month: 12, income: 200, expense: 40 },
    ];
    const select = vi.fn();
    await act(async () => {
      tree = create(
        <ReportTrend
          points={points}
          currency="COP"
          hidden={false}
          selectedMonth="2025-12"
          onSelectMonth={select}
        />,
      );
    });
    const selectedLabel = () =>
      tree!.root.findAllByType('Pressable' as never).find((node) => node.props.accessibilityState?.selected)
        ?.props.accessibilityLabel as string;
    expect(selectedLabel()).toMatch(/^Diciembre de 2025/);
    const next = tree!.root
      .findAllByType('Pressable' as never)
      .find((node) => node.props.accessibilityLabel?.startsWith('Diciembre de 2026'))!;
    await act(async () => next.props.onPress());
    expect(select).toHaveBeenCalledWith('2026-12');
    expect(selectedLabel()).toMatch(/^Diciembre de 2025/);
    await act(async () =>
      tree!.update(
        <ReportTrend
          points={points}
          currency="COP"
          hidden={false}
          selectedMonth="2026-12"
          onSelectMonth={select}
        />,
      ),
    );
    expect(selectedLabel()).toMatch(/^Diciembre de 2026/);
  });

  it('keeps the actual month selected across six/twelve month ranges and chooses the latest if it disappears', async () => {
    const points = Array.from({ length: 12 }, (_, index) => ({
      year: 2026,
      month: index + 1,
      income: (index + 1) * 100000,
      expense: (index + 1) * 10000,
    }));
    await act(async () => {
      tree = create(<ReportTrend points={points.slice(-6)} currency="COP" hidden={false} />);
    });
    const selectedLabel = () =>
      tree!.root.findAllByType('Pressable' as never).find((node) => node.props.accessibilityState?.selected)
        ?.props.accessibilityLabel as string;
    expect(selectedLabel()).toMatch(/^Diciembre de 2026/);
    await act(async () => tree!.update(<ReportTrend points={points} currency="COP" hidden={false} />));
    expect(selectedLabel()).toMatch(/^Diciembre de 2026/);
    const september = tree!.root
      .findAllByType('Pressable' as never)
      .find((node) => node.props.accessibilityLabel?.startsWith('Septiembre de 2026'))!;
    await act(async () => september.props.onPress());
    await act(async () =>
      tree!.update(<ReportTrend points={points.slice(-6)} currency="COP" hidden={false} />),
    );
    expect(selectedLabel()).toMatch(/^Septiembre de 2026/);
    await act(async () =>
      tree!.update(<ReportTrend points={points.slice(-3)} currency="COP" hidden={false} />),
    );
    expect(selectedLabel()).toMatch(/^Diciembre de 2026/);
    await act(async () => tree!.update(<ReportTrend points={points} currency="COP" hidden={false} />));
    expect(selectedLabel()).toMatch(/^Diciembre de 2026/);
  });
});
