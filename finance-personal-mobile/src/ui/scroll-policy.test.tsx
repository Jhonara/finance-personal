import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
}));
import { ScrollPolicyProvider, useTabScrollToTop } from './scroll-policy';
import { useScreenScrollPolicy } from './use-screen-scroll-policy';
const scroll = vi.fn();
let tree: ReactTestRenderer | undefined;
function Probe({ resetKey, theme }: { resetKey: string; theme: string }) {
  useScreenScrollPolicy(scroll, resetKey);
  return React.createElement('Probe', { theme, toTop: useTabScrollToTop() });
}
const content = (resetKey: string, theme = 'light') => (
  <ScrollPolicyProvider>
    <Probe resetKey={resetKey} theme={theme} />
  </ScrollPolicyProvider>
);
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  scroll.mockClear();
});
it('preserves position across rendering and appearance, then resets a new filter result once', async () => {
  await act(async () => {
    tree = create(content('COP-2026-11'));
  });
  await act(async () => tree!.update(content('COP-2026-11', 'dark')));
  expect(scroll).not.toHaveBeenCalled();
  await act(async () => tree!.update(content('USD-2026-11', 'dark')));
  expect(scroll).toHaveBeenCalledExactlyOnceWith(false);
});
it('an active tab reselect requests scrolling without remounting its screen', async () => {
  await act(async () => {
    tree = create(content('same'));
  });
  const instance = tree!.root.findByType(Probe);
  await act(async () => tree!.root.findByType('Probe' as never).props.toTop());
  expect(scroll).toHaveBeenCalledExactlyOnceWith(true);
  expect(tree!.root.findByType(Probe)).toBe(instance);
});
