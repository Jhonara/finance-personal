import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { homeShortcutQueryKey, useHomeShortcuts } from './use-home-shortcuts';
import { shortcutPreferenceKey } from './shortcut-preferences';
let tree: ReactTestRenderer | undefined;
let client: QueryClient;
function Probe({ userId }: { userId: number }) {
  return React.createElement('Probe', useHomeShortcuts(userId));
}
const probe = () => tree!.root.findByType('Probe' as never).props as ReturnType<typeof useHomeShortcuts>;
async function render(userId: number) {
  await act(async () => {
    const content = (
      <QueryClientProvider client={client}>
        <Probe userId={userId} />
      </QueryClientProvider>
    );
    if (tree) tree.update(content);
    else tree = create(content);
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 25)));
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  vi.mocked(SecureStore.setItemAsync).mockResolvedValue();
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  client.clear();
});
it('persists a chosen set and isolates it when the user changes', async () => {
  await render(1);
  await act(async () => probe().change(['inbox', 'reports']));
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(shortcutPreferenceKey(1), '["inbox","reports"]');
  expect(probe().selected).toEqual(['inbox', 'reports']);
  await render(2);
  expect(probe().selected).toEqual(['budgets', 'savings', 'credits', 'reports']);
  expect(client.getQueryData(homeShortcutQueryKey(1))).toEqual(['inbox', 'reports']);
});
it('keeps the previous set after storage failure and does not submit twice', async () => {
  await render(1);
  let rejectWrite!: (error: Error) => void;
  vi.mocked(SecureStore.setItemAsync).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectWrite = reject;
      }),
  );
  let pending!: Promise<unknown>;
  await act(async () => {
    pending = probe()
      .change(['inbox'])
      .catch((error) => error);
  });
  await act(async () => probe().change(['credits']));
  expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
  await act(async () => {
    rejectWrite(new Error('Storage unavailable'));
    await pending;
  });
  expect(probe().selected).toEqual(['budgets', 'savings', 'credits', 'reports']);
});
