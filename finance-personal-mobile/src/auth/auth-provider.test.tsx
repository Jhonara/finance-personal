import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ clear: vi.fn(), remoteLogout: vi.fn(), remoteAll: vi.fn() }));
vi.mock('axios', () => ({ default: { create: () => ({}) } }));
vi.mock('@/config/environment', () => ({
  environment: { apiBaseUrl: 'http://fixture.invalid', requestTimeoutMs: 1000 },
}));
vi.mock('@/api/client', () => ({ createApiClient: () => ({}) }));
vi.mock('@/storage/secure-session-storage', () => ({
  secureSessionStorage: { load: async () => null, save: async () => undefined, clear: mocks.clear },
}));
vi.mock('./auth-api', () => ({
  createAuthApi: () => ({
    login: async () => ({ accessToken: 'fixture-access', refreshToken: 'fixture-refresh' }),
    logout: mocks.remoteLogout,
    logoutAll: mocks.remoteAll,
  }),
}));
import { AuthProvider, useAuth } from './auth-provider';

describe('AuthProvider session cache wiring', () => {
  it.each(['logout', 'logoutAll'] as const)(
    'unmounts private state while %s runs and clears every cache on remote failure',
    async (method) => {
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
      const client = new QueryClient();
      let auth!: ReturnType<typeof useAuth>;
      function Probe() {
        auth = useAuth();
        return <div>{auth.state.status}</div>;
      }
      let tree!: ReturnType<typeof create>;
      await act(async () => {
        tree = create(
          <QueryClientProvider client={client}>
            <AuthProvider>
              <Probe />
            </AuthProvider>
          </QueryClientProvider>,
        );
      });
      await act(async () => {
        await auth.login({ email: 'fixture@example.com', password: 'fixture' });
      });
      for (const key of ['current-user', 'accounts', 'credits', 'alerts', 'dashboard'])
        client.setQueryData([key], { secret: 'old user' });
      let reject!: (reason: Error) => void;
      (method === 'logout' ? mocks.remoteLogout : mocks.remoteAll).mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      );
      let pending!: Promise<void>;
      await act(async () => {
        pending = auth[method]().catch(() => undefined);
      });
      expect(auth.state.status).toBe('bootstrapping');
      expect(client.getQueryCache().getAll()).toHaveLength(0);
      await act(async () => {
        reject(Error('offline'));
        await pending;
      });
      expect(auth.state.status).toBe('unauthenticated');
      expect(mocks.clear).toHaveBeenCalled();
      expect(client.getQueryCache().getAll()).toHaveLength(0);
      if (method === 'logoutAll') expect(mocks.remoteAll).toHaveBeenCalledWith('fixture-access');
      await act(async () => {
        tree.unmount();
      });
      client.clear();
    },
  );
});
