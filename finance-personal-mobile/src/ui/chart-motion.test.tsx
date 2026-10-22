import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';
const settings = vi.hoisted(() => ({ reduced: false }));
vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
}));
vi.mock('@/ui/use-reduced-motion', () => ({ useReducedMotion: () => settings.reduced }));
vi.mock('react-native-reanimated', () => import('@/test/chart-reanimated'));
vi.mock('react-native-svg', () => {
  const host = (name: string) => (props: object) => React.createElement(name, props);
  return { Circle: host('Circle'), Rect: host('Rect'), Path: host('Path') };
});
import { cancelAnimation, withTiming } from '@/test/chart-reanimated';
import { DrawingLine, GrowingArc, GrowingBar, useChartReveal } from './chart-motion';

let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  settings.reduced = false;
  vi.clearAllMocks();
});
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
});

describe('chart motion and accessibility', () => {
  function Reveal({ revision, enabled = true }: { revision: string; enabled?: boolean }) {
    useChartReveal(revision, enabled);
    return null;
  }
  it('reveals new data once, cancels on unmount and does not loop on unrelated renders', async () => {
    await act(async () => {
      tree = create(<Reveal revision="October" />);
    });
    expect(withTiming).toHaveBeenCalledTimes(1);
    await act(async () => tree!.update(<Reveal revision="October" />));
    expect(withTiming).toHaveBeenCalledTimes(1);
    await act(async () => tree!.update(<Reveal revision="November" />));
    expect(withTiming).toHaveBeenCalledTimes(2);
    cancelAnimation.mockClear();
    await act(async () => tree!.unmount());
    tree = undefined;
    expect(cancelAnimation).toHaveBeenCalled();
  });
  it('shows final geometry immediately for reduced motion and hidden data', async () => {
    settings.reduced = true;
    await act(async () => {
      tree = create(<Reveal revision="October" />);
    });
    expect(withTiming).not.toHaveBeenCalled();
    settings.reduced = false;
    await act(async () => tree!.update(<Reveal revision="November" enabled={false} />));
    expect(withTiming).not.toHaveBeenCalled();
  });
  it.each([0, 0.5, 1])(
    'grows signed bars from zero and reveals arcs and paths at %s progress',
    async (value) => {
      const progress = { value } as SharedValue<number>;
      await act(async () => {
        tree = create(
          <>
            <GrowingBar progress={progress} zero={80} targetY={20} targetHeight={60} />
            <GrowingBar progress={progress} zero={80} targetY={80} targetHeight={40} />
            <GrowingArc progress={progress} length={50} start={20} circumference={100} />
            <DrawingLine progress={progress} length={120} d="M0,0 L120,0" />
          </>,
        );
      });
      const bars = tree!.root.findAll((node) => String(node.type) === 'Rect');
      expect(bars[0]!.props.y).toBe(80 - 60 * value);
      expect(bars[0]!.props.height).toBe(60 * value);
      expect(bars[1]!.props.y).toBe(80);
      expect(bars[1]!.props.height).toBe(40 * value);
      const arc = tree!.root.find((node) => String(node.type) === 'Circle');
      expect(arc.props.strokeDasharray).toEqual([50 * value, 100]);
      expect(arc.props.strokeDashoffset).toBe(-20 * value);
      expect(tree!.root.find((node) => String(node.type) === 'Path').props.strokeDashoffset).toBe(
        120 * (1 - value),
      );
    },
  );
});
