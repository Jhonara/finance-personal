import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionState } from '@/auth/session-types';
import type { NativeInvocation } from './native-types';

const mocks = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    tokens: { accessToken: 'test', refreshToken: 'test', expiresIn: 60, tokenType: 'Bearer' },
  } as SessionState,
  available: true,
  currentUser: vi.fn(),
  post: vi.fn(),
  complete: vi.fn(),
  setOwner: vi.fn(),
  alert: vi.fn(),
  push: vi.fn(),
  openForm: vi.fn(),
  pending: [] as NativeInvocation[],
  wake: () => {},
  pathname: '/inbox',
}));
vi.mock('@/auth/auth-provider', () => ({
  useAuth: () => ({ state: mocks.state }),
  api: { post: mocks.post },
}));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: mocks.currentUser }));
vi.mock('./native-bridge', () => ({
  nativeIntentBridge: {
    get available() {
      return mocks.available;
    },
    setOwner: mocks.setOwner,
    pending: async (owner: string) => mocks.pending.filter((p) => p.ownerId === owner),
    complete: mocks.complete,
    listen: (wake: () => void) => {
      mocks.wake = wake;
      return { remove: vi.fn() };
    },
  },
}));
vi.mock('react-native', () => ({ AppState: { addEventListener: () => ({ remove: vi.fn() }) } }));
vi.mock('expo-router', () => ({ router: { push: mocks.push }, usePathname: () => mocks.pathname }));
vi.mock('@/features/forms/form-session', () => ({ openForm: mocks.openForm }));
vi.mock('@/features/forms/use-unsaved-form', () => ({ requestFormExit: (action: () => void) => action() }));
vi.mock('@/feedback/app-alert', () => ({ AppAlert: { alert: mocks.alert } }));
import { NativeIntentsProvider, useNativeIntents } from './native-intents-provider';

let tree: ReactTestRenderer | undefined;
let context: ReturnType<typeof useNativeIntents>;
const item: NativeInvocation = {
  id: '11111111-1111-1111-1111-111111111111',
  ownerId: '1',
  name: 'importWallet',
  params: { amount: '100', currency: 'COP' },
};
function Probe() {
  context = useNativeIntents();
  return null;
}
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const render = (queryClient: QueryClient) => (
  <QueryClientProvider client={queryClient}>
    <NativeIntentsProvider>
      <Probe />
    </NativeIntentsProvider>
  </QueryClientProvider>
);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.available = true;
  mocks.pending = [{ ...item }];
  mocks.pathname = '/inbox';
  mocks.state = {
    status: 'authenticated',
    tokens: { accessToken: 'test', refreshToken: 'test', expiresIn: 60, tokenType: 'Bearer' },
  };
  mocks.currentUser.mockResolvedValue({ id: 1 });
  mocks.post.mockResolvedValue({ data: { id: 9, status: 'PENDING' } });
  mocks.setOwner.mockResolvedValue(undefined);
  mocks.complete.mockImplementation(async (owner: string, id: string) => {
    mocks.pending = mocks.pending.filter((p) => p.ownerId !== owner || p.id !== id);
  });
});
afterEach(async () => {
  if (tree) await act(async () => tree?.unmount());
  tree = undefined;
});
describe('native consumer lifecycle', () => {
  it('waits for the authenticated owner and then commits before acknowledging', async () => {
    await act(async () => {
      tree = create(render(client()));
    });
    expect(mocks.setOwner).toHaveBeenCalledWith('1');
    expect(mocks.post).toHaveBeenCalledWith(
      '/inbox/native',
      expect.objectContaining({ ownerId: 1, invocationId: item.id }),
    );
    expect(mocks.complete).toHaveBeenCalledWith('1', item.id);
    expect(mocks.post.mock.invocationCallOrder[0]).toBeLessThan(mocks.complete.mock.invocationCallOrder[0]!);
    expect(context.pending).toEqual([]);
  });
  it('retains failed delivery for an explicit retry', async () => {
    mocks.post.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      tree = create(render(client()));
    });
    expect(context.pending).toHaveLength(1);
    expect(context.error).not.toBe('');
    expect(mocks.complete).not.toHaveBeenCalled();
    await act(async () => context.retry());
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(mocks.post.mock.calls[0]?.[1]).toEqual(mocks.post.mock.calls[1]?.[1]);
  });
  it('does not acknowledge a response after logout', async () => {
    let finish!: (result: { data: { id: number; status: string } }) => void;
    mocks.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const queryClient = client();
    await act(async () => {
      tree = create(render(queryClient));
    });
    mocks.state = { status: 'unauthenticated' };
    await act(async () => tree?.update(render(queryClient)));
    await act(async () => finish({ data: { id: 9, status: 'PENDING' } }));
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(context.pending).toEqual([]);
  });
  it('never imports pending work from another user', async () => {
    mocks.currentUser.mockResolvedValue({ id: 2 });
    await act(async () => {
      tree = create(render(client()));
    });
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.pending).toHaveLength(1);
  });
  it('does not start work on Android or Expo Go', async () => {
    mocks.available = false;
    await act(async () => {
      tree = create(render(client()));
    });
    expect(mocks.currentUser).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('keeps an entry action pending until its destination opens', async () => {
    mocks.pending = [{ ...item, name: 'openIncome', params: {} }];
    const queryClient = client();
    await act(async () => {
      tree = create(render(queryClient));
    });
    expect(mocks.openForm).toHaveBeenCalledWith('/(app)/new-income');
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
    mocks.pathname = '/new-income';
    await act(async () => tree?.update(render(queryClient)));
    expect(mocks.complete).toHaveBeenCalledWith('1', item.id);
  });
});
