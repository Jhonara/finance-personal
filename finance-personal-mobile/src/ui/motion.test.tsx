import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  reduced: false,
  listener: undefined as undefined | ((value: boolean) => void),
  targets: [] as Array<{ value: { current: number }; target: number; duration: number }>,
  stopped: vi.fn(),
  removed: vi.fn(),
}));
vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
}));
vi.mock('react-native', () => {
  const host =
    (name: string) =>
    ({ children, ...props }: React.PropsWithChildren) =>
      React.createElement(name, props, children);
  return {
    Modal: host('Modal'),
    View: host('View'),
    Text: host('Text'),
    Pressable: host('Pressable'),
    Platform: { select: (x: { default?: unknown; android?: unknown }) => x.default ?? x.android },
    StyleSheet: { create: (x: unknown) => x },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => native.reduced,
      addEventListener: (_name: string, listener: (value: boolean) => void) => {
        native.listener = listener;
        return { remove: native.removed };
      },
    },
    Animated: {
      View: host('AnimatedView'),
      Text: host('Text'),
      Value: class {
        constructor(public current: number) {}
        setValue(value: number) {
          this.current = value;
        }
        interpolate() {
          return this.current;
        }
      },
      timing: (value: { current: number }, options: { toValue: number; duration: number }) => {
        native.targets.push({ value, target: options.toValue, duration: options.duration });
        return {
          start: (callback?: (result: { finished: boolean }) => void) => {
            value.current = options.toValue;
            callback?.({ finished: true });
          },
          stop: native.stopped,
        };
      },
    },
  };
});
import { MotionModal } from './motion-modal';
import { MoneyText, pressFeedback } from './motion';
import { Progress } from './progress';
import { useReducedMotion } from './use-reduced-motion';
import { motion } from '@/theme';

beforeEach(() => {
  native.reduced = false;
  native.targets = [];
  native.stopped.mockClear();
  native.removed.mockClear();
});
describe('financial motion', () => {
  it('lets a financial form reject a close while pending without fading it out', async () => {
    const guardedClose = vi.fn();
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <MotionModal visible onRequestClose={guardedClose}>
          <>Pago pendiente</>
        </MotionModal>,
      );
    });
    native.targets = [];
    const modal = tree.root.find((node) => (node.type as unknown) === 'Modal');
    await act(async () => modal.props.onRequestClose());
    expect(guardedClose).toHaveBeenCalledOnce();
    expect(modal.props.visible).toBe(true);
    expect(native.targets).toHaveLength(0);
    await act(async () => tree.unmount());
  });
  it('removes press transforms with reduced motion while retaining immediate feedback', () => {
    expect(pressFeedback(true, false)).toEqual({
      opacity: motion.pressOpacity,
      transform: [{ scale: 0.98 }],
    });
    expect(pressFeedback(true, true)).toEqual({ opacity: motion.pressOpacity, transform: [{ scale: 1 }] });
  });
  it('updates the existing progress value, never restarting from zero on an unchanged render', async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<Progress value={35} />);
    });
    const value = native.targets.at(-1)!.value;
    expect(value.current).toBe(35);
    native.targets = [];
    await act(async () => tree.update(<Progress value={70} />));
    expect(native.targets).toHaveLength(1);
    expect(native.targets[0]).toMatchObject({ value, target: 70, duration: motion.slow });
    native.targets = [];
    await act(async () => tree.update(<Progress value={70} />));
    expect(native.targets).toHaveLength(0);
    await act(async () => tree.unmount());
    expect(native.stopped).toHaveBeenCalled();
  });
  it('sets progress immediately and clamps the target with reduced motion', async () => {
    native.reduced = true;
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<Progress value={20} />);
    });
    await act(async () => tree.update(<Progress value={130} />));
    expect(native.targets).toHaveLength(0);
    expect(
      tree.root.find((node) => node.props.accessibilityRole === 'progressbar').props.accessibilityValue.now,
    ).toBe(100);
    await act(async () => tree.unmount());
  });
  it('replaces financial text immediately and never retains the old amount in privacy mode', async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<MoneyText>$ 1.234,56</MoneyText>);
    });
    await act(async () => tree.update(<MoneyText>$ ••••••</MoneyText>));
    expect(JSON.stringify(tree.toJSON())).not.toContain('1.234,56');
    expect(JSON.stringify(tree.toJSON())).toContain('••••••');
    await act(async () => tree.unmount());
  });
  it('responds to the system preference while mounted and cleans up its listener', async () => {
    function Probe() {
      return <>{String(useReducedMotion())}</>;
    }
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<Probe />);
    });
    expect(tree.toJSON()).toBe('false');
    await act(async () => native.listener?.(true));
    expect(tree.toJSON()).toBe('true');
    await act(async () => tree.unmount());
    expect(native.removed).toHaveBeenCalled();
  });
});
