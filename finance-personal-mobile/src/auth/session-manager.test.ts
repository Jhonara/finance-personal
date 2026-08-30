import { describe, expect, it } from 'vitest';

import type { AuthApi } from './auth-api';
import { SessionManager } from './session-manager';
import type { AuthTokens, SessionStorage } from './session-types';

const original: AuthTokens = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
};
const renewed: AuthTokens = { ...original, accessToken: 'access-2', refreshToken: 'refresh-2' };

function storage(initial: AuthTokens | null = null): SessionStorage & { current(): AuthTokens | null } {
  let stored = initial;
  return {
    load: async () => stored,
    save: async (tokens) => {
      stored = tokens;
    },
    clear: async () => {
      stored = null;
    },
    current: () => stored,
  };
}

function authApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    login: async () => original,
    register: async () => original,
    refresh: async () => renewed,
    logout: async () => undefined,
    logoutAll: async () => undefined,
    ...overrides,
  };
}

describe('SessionManager', () => {
  it('persists a login and refreshes the stored session at bootstrap', async () => {
    const sessionStorage = storage();
    const manager = new SessionManager(sessionStorage, authApi());
    await expect(manager.login({ email: 'user@example.com', password: 'secret' })).resolves.toMatchObject({
      status: 'authenticated',
    });
    expect(sessionStorage.current()).toEqual(original);

    const restored = new SessionManager(sessionStorage, authApi());
    await expect(restored.bootstrap()).resolves.toEqual({ status: 'authenticated', tokens: renewed });
    expect(sessionStorage.current()).toEqual(renewed);
  });

  it('clears the local session when refresh is rejected', async () => {
    const sessionStorage = storage(original);
    const manager = new SessionManager(
      sessionStorage,
      authApi({
        refresh: async () => {
          throw new Error('expired');
        },
      }),
    );

    await expect(manager.bootstrap()).resolves.toEqual({ status: 'unauthenticated' });
    expect(sessionStorage.current()).toBeNull();
  });

  it('clears local tokens even when remote logout fails', async () => {
    const sessionStorage = storage(original);
    const manager = new SessionManager(
      sessionStorage,
      authApi({
        logout: async () => {
          throw new Error('offline');
        },
      }),
    );
    await manager.bootstrap();

    await expect(manager.logout()).rejects.toThrow('offline');
    expect(sessionStorage.current()).toBeNull();
  });
});
