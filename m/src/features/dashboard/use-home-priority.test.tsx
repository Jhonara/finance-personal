import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('expo-secure-store', () => ({ getItemAsync: storage.read, setItemAsync: storage.write }));
import { homePriorityKey } from './home-priority';
import { homePriorityQueryKey, useHomePriority } from './use-home-priority';

let client: QueryClient;
let trees: ReturnType<typeof create>[];
let saved: Map<string, string>;
function Probe({ userId }: { userId?: number }) {
  return React.createElement('Probe', useHomePriority(userId));
}
const value = (tree: ReturnType<typeof create>) =>
  tree.root.findByType('Probe' as never).props as ReturnType<typeof useHomePriority>;
const contents = (userId?: number) => (
  <QueryClientProvider client={client}>
    <Probe userId={userId} />
  </QueryClientProvider>
);
async function render(userId?: number) {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(contents(userId));
  });
  trees.push(tree);
  return tree;
}
async function settle(check: () => void) {
  await act(async () => {
    await vi.waitFor(check);
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  trees = [];
  saved = new Map();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  storage.read.mockImplementation(async (key: string) => saved.get(key) ?? null);
  storage.write.mockImplementation(async (key: string, setting: string) => {
    saved.set(key, setting);
  });
});
afterEach(async () => {
  await act(async () => {
    trees.forEach((tree) => tree.unmount());
  });
  client.clear();
});

describe('Per-profile Home preference', () => {
  it('waits for a known profile before accessing storage', async () => {
    const tree = await render();
    expect(value(tree).ready).toBe(false);
    await act(async () => {
      expect(await value(tree).change('debt')).toBe(false);
    });
    expect(storage.read).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
  });
  it('persists the choice across cache resets and allows returning to general view', async () => {
    const tree = await render(1);
    await settle(() => expect(value(tree).ready).toBe(true));
    await act(async () => {
      await value(tree).change('debt');
    });
    await settle(() => expect(value(tree).priority).toBe('debt'));
    expect(saved.get(homePriorityKey(1))).toBe('debt');
    await act(async () => {
      tree.unmount();
    });
    client.clear();
    const reopened = await render(1);
    await settle(() => expect(value(reopened).priority).toBe('debt'));
    await act(async () => {
      await value(reopened).change('general');
    });
    expect(saved.get(homePriorityKey(1))).toBe('general');
  });
  it('retains the previous preference on failure and prevents duplicate writes', async () => {
    saved.set(homePriorityKey(1), 'savings');
    const tree = await render(1);
    await settle(() => expect(value(tree).ready).toBe(true));
    storage.write.mockRejectedValueOnce(new Error('Full storage'));
    await act(async () => {
      await expect(value(tree).change('debt')).rejects.toThrow('Full storage');
    });
    expect(value(tree).priority).toBe('savings');
    expect(saved.get(homePriorityKey(1))).toBe('savings');
    const write = deferred<void>();
    storage.write.mockImplementation(() => write.promise);
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = value(tree).change('debt');
    });
    await act(async () => {
      expect(await value(tree).change('expenses')).toBe(false);
    });
    expect(storage.write).toHaveBeenCalledTimes(2);
    await act(async () => {
      write.resolve();
      await pending;
    });
    await settle(() => expect(value(tree).priority).toBe('debt'));
  });
  it('does not overwrite an unreadable preference with the default', async () => {
    storage.read.mockRejectedValueOnce(new Error('Unavailable'));
    const tree = await render(1);
    await settle(() => expect(value(tree).error).toBe(true));
    await act(async () => {
      expect(await value(tree).change('expenses')).toBe(false);
    });
    expect(storage.write).not.toHaveBeenCalled();
    saved.set(homePriorityKey(1), 'savings');
    await act(async () => {
      await value(tree).retry();
    });
    await settle(() => expect(value(tree).priority).toBe('savings'));
  });
  it('isolates profiles even when the previous profile finishes saving late', async () => {
    saved.set(homePriorityKey(2), 'expenses');
    const tree = await render(1);
    await settle(() => expect(value(tree).ready).toBe(true));
    const write = deferred<void>();
    storage.write.mockImplementation(() => write.promise);
    let pending!: Promise<boolean>;
    await act(async () => {
      pending = value(tree).change('debt');
    });
    await act(async () => {
      tree.update(contents(2));
    });
    await settle(() => expect(value(tree).priority).toBe('expenses'));
    await act(async () => {
      write.resolve();
      await pending;
    });
    expect(storage.write).toHaveBeenCalledWith(homePriorityKey(1), 'debt');
    expect(value(tree).priority).toBe('expenses');
    expect(client.getQueryData(homePriorityQueryKey(2))).toBe('expenses');
  });
  it('discards an old background read when a new choice is saved', async () => {
    saved.set(homePriorityKey(1), 'savings');
    const tree = await render(1);
    await settle(() => expect(value(tree).ready).toBe(true));
    const oldRead = deferred<string>();
    storage.read.mockReturnValueOnce(oldRead.promise);
    await act(async () => {
      void value(tree).retry();
    });
    await act(async () => {
      await value(tree).change('debt');
    });
    await act(async () => {
      oldRead.resolve('savings');
    });
    await settle(() => expect(value(tree).priority).toBe('debt'));
  });
});
