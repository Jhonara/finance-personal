import React, { type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const guard = vi.hoisted(() => vi.fn<(leave: () => void) => void>());
vi.mock('@/features/forms/use-unsaved-form', () => ({ requestFormExit: guard }));
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
  StyleSheet: { create: (styles: object) => styles, flatten: (style: unknown) => style },
  Keyboard: { addListener: () => ({ remove: vi.fn() }) },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock('react-native-reanimated', () => ({
  default: { View: 'AnimatedView' },
  useSharedValue: (value: number) => React.useRef({ value }).current,
  useAnimatedStyle: (factory: () => object) => factory(),
  withSpring: (value: number) => value,
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
vi.mock('@/theme/theme-provider', () => ({ useAppTheme: () => ({ palette: { background: '#fff' } }) }));
vi.mock('./use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('./motion', () => ({ MotionPressable: 'DockButton' }));
vi.mock('./center-action', () => ({ CenterActionButton: 'NewMovementButton' }));

import { NavigationDock } from './navigation-dock';
type DockProps = ComponentProps<typeof NavigationDock>;
const emit = vi.fn();
const navigateToTab = vi.fn<DockProps['navigateToTab']>();
const routes = [
  { key: 'home-0', name: 'index' },
  { key: 'transactions-1', name: 'transactions' },
  { key: 'accounts-2', name: 'accounts' },
  { key: 'plan-3', name: 'plan' },
  { key: 'credits-4', name: 'credits' },
];
let tree: ReactTestRenderer;
const renderDock = (index = 0) =>
  act(async () => {
    tree = create(
      <NavigationDock
        state={{ routes, index }}
        descriptors={{}}
        emitter={{ emit }}
        navigateToTab={navigateToTab}
        insets={{ top: 0, bottom: 24, left: 0, right: 0 }}
      />,
    );
  });
const button = (label: string) =>
  tree.root.find((node) => String(node.type) === 'DockButton' && node.props.accessibilityLabel === label);

beforeEach(() => {
  vi.clearAllMocks();
  emit.mockReturnValue({ type: 'tabPress', defaultPrevented: false, preventDefault: vi.fn() });
  guard.mockImplementation((leave) => leave());
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});

it('switches tabs with the SDK 58 route key after checking unsaved changes', async () => {
  await renderDock();
  await act(async () => button('Cuentas').props.onPress());
  expect(emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'accounts-2', canPreventDefault: true });
  expect(guard).toHaveBeenCalledTimes(1);
  expect(navigateToTab).toHaveBeenCalledExactlyOnceWith('accounts-2');
});

it('keeps the form open until its exit guard allows navigation', async () => {
  guard.mockImplementation(() => {});
  await renderDock();
  await act(async () => button('Movimientos').props.onPress());
  expect(navigateToTab).not.toHaveBeenCalled();
  await act(async () => guard.mock.calls[0]![0]());
  expect(navigateToTab).toHaveBeenCalledExactlyOnceWith('transactions-1');
});

it('respects a prevented tab press', async () => {
  emit.mockReturnValue({ type: 'tabPress', defaultPrevented: true, preventDefault: vi.fn() });
  await renderDock();
  await act(async () => button('Cuentas').props.onPress());
  expect(guard).not.toHaveBeenCalled();
  expect(navigateToTab).not.toHaveBeenCalled();
});

it('emits presses on the active tab without navigating again', async () => {
  await renderDock();
  await act(async () => button('Inicio').props.onPress());
  expect(emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'home-0', canPreventDefault: true });
  expect(navigateToTab).not.toHaveBeenCalled();
});

it('preserves long press events', async () => {
  await renderDock();
  await act(async () => button('Cuentas').props.onLongPress());
  expect(emit).toHaveBeenCalledExactlyOnceWith({ type: 'tabLongPress', target: 'accounts-2' });
  expect(navigateToTab).not.toHaveBeenCalled();
});

it('keeps internal routes reachable without adding extra dock buttons', async () => {
  await renderDock(4);
  expect(tree.root.findAll((node) => String(node.type) === 'DockButton')).toHaveLength(4);
  expect(button('Menú: reportes y herramientas').props.accessibilityState.selected).toBe(true);
  await act(async () => button('Inicio').props.onPress());
  expect(navigateToTab).toHaveBeenCalledExactlyOnceWith('home-0');
});
