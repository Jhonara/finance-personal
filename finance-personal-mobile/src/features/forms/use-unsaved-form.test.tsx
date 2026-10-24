import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ alert: vi.fn(), back: vi.fn(), handlers: new Set<() => boolean>() }));
vi.mock('expo-router', () => ({
  router: { back: mocks.back },
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
}));
vi.mock('react-native', () => ({
  Alert: { alert: mocks.alert },
  BackHandler: {
    addEventListener: (_: string, handler: () => boolean) => {
      mocks.handlers.add(handler);
      return { remove: () => mocks.handlers.delete(handler) };
    },
  },
}));
import { hasFormChanges, requestFormExit, useUnsavedForm } from './use-unsaved-form';
let tree: ReactTestRenderer | undefined;
function Probe(props: Parameters<typeof useUnsavedForm>[0]) {
  return React.createElement('Probe', useUnsavedForm(props));
}
async function render(props: Parameters<typeof useUnsavedForm>[0]) {
  await act(async () => {
    if (tree) tree.update(<Probe {...props} />);
    else tree = create(<Probe {...props} />);
  });
}
const hardware = () => [...mocks.handlers].at(-1)!();
const request = (leave: () => void) => tree!.root.findByType('Probe' as never).props.request(leave);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(async () => {
  if (tree) await act(async () => tree!.unmount());
  tree = undefined;
  mocks.handlers.clear();
});
it('compares field values independent of key order or undefined optional fields', () => {
  expect(hasFormChanges({ name: '', account: undefined }, { name: '' })).toBe(false);
  expect(hasFormChanges({ amount: '10', name: 'A' }, { name: 'A', amount: '10' })).toBe(false);
  expect(hasFormChanges({ amount: '11' }, { amount: '10' })).toBe(true);
});
it('leaves clean forms without confirmation and ignores inactive modal forms', async () => {
  await render({ dirty: false });
  expect(hardware()).toBe(true);
  expect(mocks.back).toHaveBeenCalledTimes(1);
  expect(mocks.alert).not.toHaveBeenCalled();
  await render({ dirty: true, enabled: false });
  expect(hardware()).toBe(false);
});
it('keeps editing on cancel and leaves only after discarding', async () => {
  const leave = vi.fn();
  await render({ dirty: true, onBack: leave });
  hardware();
  hardware();
  expect(mocks.alert).toHaveBeenCalledTimes(1);
  expect(leave).not.toHaveBeenCalled();
  mocks.alert.mock.calls[0]![2][0].onPress();
  expect(leave).not.toHaveBeenCalled();
  hardware();
  mocks.alert.mock.calls[1]![2][1].onPress();
  expect(leave).toHaveBeenCalledTimes(1);
});
it('lets a selector consume Android Back and blocks leaving during submission', async () => {
  const leave = vi.fn();
  await render({ dirty: true, suspended: true });
  expect(hardware()).toBe(false);
  expect(mocks.alert).not.toHaveBeenCalled();
  await render({ dirty: true, busy: true });
  expect(hardware()).toBe(true);
  request(leave);
  expect(mocks.alert).not.toHaveBeenCalled();
  expect(leave).not.toHaveBeenCalled();
});
it('steps back inside a wizard without treating it as discarding the form', async () => {
  const previous = vi.fn();
  await render({ dirty: true, onStepBack: previous });
  hardware();
  expect(previous).toHaveBeenCalledTimes(1);
  expect(mocks.alert).not.toHaveBeenCalled();
});
it('guards dock exits and drops the guard after leaving the screen', async () => {
  const leave = vi.fn();
  await render({ dirty: true });
  requestFormExit(leave);
  expect(leave).not.toHaveBeenCalled();
  const discard = mocks.alert.mock.calls[0]![2][1].onPress;
  await act(async () => tree!.unmount());
  tree = undefined;
  discard();
  expect(leave).not.toHaveBeenCalled();
  requestFormExit(leave);
  expect(leave).toHaveBeenCalledTimes(1);
});
