import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionState } from '@/auth/session-types';
import { launcherDestination } from './destinations';

const mocks = vi.hoisted(() => ({
  state: { status: 'unauthenticated' } as SessionState,
  action: 'expense' as string | string[] | undefined,
  platform: 'android',
  me: vi.fn(),
  logout: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mocks.platform;
    },
  },
}));
vi.mock('expo-router', () => ({
  router: { push: mocks.push, replace: mocks.replace },
  useLocalSearchParams: () => ({ action: mocks.action }),
}));
vi.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ state: mocks.state, logout: mocks.logout }) }));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: mocks.me }));
vi.mock('@/ui/primitives', () => ({ Screen: 'Screen', Button: 'Button' }));
vi.mock('@/ui/states', () => ({ EmptyState: 'EmptyState', SkeletonRow: 'SkeletonRow' }));
vi.mock('@/app/(auth)/login', () => ({ default: () => <div>Real login screen</div> }));
import AndroidShortcutScreen from '@/app/android-shortcut';

let tree: ReactTestRenderer | undefined;
let client: QueryClient;
const authenticated = (): SessionState => ({
  status: 'authenticated',
  tokens: {
    accessToken: 'fixture',
    refreshToken: 'fixture',
    tokenType: 'Bearer',
    expiresIn: 60,
  },
});
const render = () => (
  <QueryClientProvider client={client}>
    <AndroidShortcutScreen />
  </QueryClientProvider>
);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.state = authenticated();
  mocks.action = 'expense';
  mocks.platform = 'android';
  mocks.me.mockResolvedValue({ id: 1 });
  mocks.logout.mockResolvedValue(undefined);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  if (tree) await act(async () => tree?.unmount());
  tree = undefined;
  client.clear();
});
describe('Android launcher entry', () => {
  it.each([
    ['expense', '/(app)/new-expense'],
    ['income', '/(app)/new-income'],
    ['transfer', '/(app)/new-transfer'],
  ])(
    'opens the real %s form only after the session check with a single navigation',
    async (action, pathname) => {
      mocks.action = action;
      await act(async () => {
        tree = create(render());
      });
      expect(mocks.me).toHaveBeenCalledTimes(1);
      expect(mocks.replace).toHaveBeenCalledTimes(1);
      expect(mocks.replace).toHaveBeenCalledWith({
        pathname,
        params: { formSession: expect.stringMatching(/^launcher-/) },
      });
      expect(mocks.push).not.toHaveBeenCalled();
      expect(mocks.me.mock.invocationCallOrder[0]).toBeLessThan(mocks.replace.mock.invocationCallOrder[0]!);
    },
  );
  it('invalidates server balances and opens existing accounts', async () => {
    mocks.action = 'balance';
    client.setQueryData(['dashboard', 2026, 10], { marker: 'old' });
    client.setQueryData(['accounts', 'list'], []);
    await act(async () => {
      tree = create(render());
    });
    expect(client.getQueryState(['dashboard', 2026, 10])?.isInvalidated).toBe(true);
    expect(mocks.replace).toHaveBeenCalledWith('/(app)/accounts');
    expect(mocks.push).not.toHaveBeenCalled();
  });
  it.each(['expense', 'income', 'transfer', 'balance'])('retains %s through login', async (action) => {
    mocks.action = action;
    mocks.state = { status: 'unauthenticated' };
    await act(async () => {
      tree = create(render());
    });
    expect(tree?.root.findByType('div').children).toContain('Real login screen');
    expect(mocks.me).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    mocks.state = authenticated();
    await act(async () => tree?.update(render()));
    if (action === 'balance') expect(mocks.replace).toHaveBeenCalledWith(launcherDestination(action));
    else
      expect(mocks.replace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: launcherDestination(action) }),
      );
  });
  it('handles an expired refresh session then continues the same action after login', async () => {
    mocks.action = 'transfer';
    mocks.me.mockRejectedValueOnce({ response: { status: 401 } });
    await act(async () => {
      tree = create(render());
    });
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.replace).not.toHaveBeenCalled();
    mocks.state = { status: 'unauthenticated' };
    await act(async () => tree?.update(render()));
    expect(tree?.root.findByType('div').children).toContain('Real login screen');
    mocks.state = authenticated();
    await act(async () => tree?.update(render()));
    expect(mocks.replace).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(app)/new-transfer' }));
  });
  it('waits for bootstrap and ignores a stale response after logout', async () => {
    mocks.state = { status: 'bootstrapping' };
    await act(async () => {
      tree = create(render());
    });
    expect(mocks.me).not.toHaveBeenCalled();
    let finish!: (value: { id: number }) => void;
    mocks.me.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mocks.state = authenticated();
    await act(async () => tree?.update(render()));
    mocks.state = { status: 'unauthenticated' };
    await act(async () => tree?.update(render()));
    await act(async () => finish({ id: 1 }));
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it('preserves the action on connection failure and retries without logging out', async () => {
    mocks.me.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      tree = create(render());
    });
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
    const retry = tree?.root.findAll((node) => String(node.type) === 'Button')[0];
    await act(async () => retry?.props.onPress());
    expect(mocks.replace).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, 'https://evil.example', '__proto__', ['expense', 'income']])(
    'rejects unsupported action %j',
    async (action) => {
      mocks.action = action;
      await act(async () => {
        tree = create(render());
      });
      expect(mocks.me).not.toHaveBeenCalled();
      expect(mocks.replace).not.toHaveBeenCalled();
    },
  );
  it('does not activate the Android entry on iOS', async () => {
    mocks.platform = 'ios';
    await act(async () => {
      tree = create(render());
    });
    expect(mocks.me).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
