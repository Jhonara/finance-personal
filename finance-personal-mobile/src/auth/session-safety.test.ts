import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { clearSessionCache } from './session-cache';
import { SessionManager } from './session-manager';
import type { AuthApi } from './auth-api';
const tokens = {
  accessToken: 'current-access',
  refreshToken: 'current-refresh',
  expiresIn: 900,
  tokenType: 'Bearer',
};
function setup(api: Partial<AuthApi> = {}) {
  let stored: typeof tokens | null = null;
  const manager = new SessionManager(
    {
      load: async () => stored,
      save: async (value) => {
        stored = value;
      },
      clear: async () => {
        stored = null;
      },
    },
    {
      login: async () => tokens,
      register: async () => tokens,
      refresh: async () => tokens,
      logout: async () => undefined,
      logoutAll: async () => undefined,
      ...api,
    },
  );
  return { manager, stored: () => stored };
}
describe('Session boundaries', () => {
  it('cancels late reads and removes every user query and mutation', async () => {
    const client = new QueryClient();
    for (const key of ['me', 'accounts', 'credits', 'alerts', 'dashboard', 'transactions'])
      client.setQueryData([key], { private: 'previous user' });
    let resolve!: (value: string) => void;
    const request = client
      .fetchQuery({
        queryKey: ['late'],
        queryFn: () =>
          new Promise<string>((done) => {
            resolve = done;
          }),
      })
      .catch(() => undefined);
    await clearSessionCache(client);
    resolve('previous user');
    await request;
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    client.clear();
  });
  it('does not resurrect a session when an in-flight refresh finishes after logout', async () => {
    let resolve!: (value: typeof tokens) => void;
    const { manager, stored } = setup({
      refresh: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    await manager.login({ email: 'test@example.com', password: 'test' });
    const pending = manager.refresh();
    await manager.logout();
    resolve(tokens);
    expect(await pending).toBeNull();
    expect(stored()).toBeNull();
    expect(manager.getAccessToken()).toBeNull();
  });
  it('uses the current access token and clears local state if logout-all fails remotely', async () => {
    let used: string | undefined;
    const { manager, stored } = setup({
      logoutAll: async (token) => {
        used = token;
        throw Error('offline');
      },
    });
    await manager.login({ email: 'test@example.com', password: 'test' });
    await expect(manager.logoutAll()).rejects.toThrow('offline');
    expect(used).toBe(tokens.accessToken);
    expect(stored()).toBeNull();
    expect(manager.getAccessToken()).toBeNull();
  });
  it('does not claim logout-all without an access token', async () => {
    const { manager } = setup();
    await expect(manager.logoutAll()).rejects.toThrow('No hay una sesión activa');
  });
});
