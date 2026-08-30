import type { AuthTokens, SessionStorage } from '@/auth/session-types';

type SecureStoreAdapter = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

const SESSION_KEY = 'finance-personal.session.v1';

export function createSecureSessionStorage(adapter: SecureStoreAdapter): SessionStorage {
  return {
    async load() {
      const serialized = await adapter.getItemAsync(SESSION_KEY);
      if (!serialized) return null;
      try {
        const parsed = JSON.parse(serialized) as Partial<AuthTokens>;
        if (typeof parsed.accessToken !== 'string' || typeof parsed.refreshToken !== 'string') return null;
        return {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
          tokenType: typeof parsed.tokenType === 'string' ? parsed.tokenType : 'Bearer',
          expiresIn: typeof parsed.expiresIn === 'number' ? parsed.expiresIn : 0,
        };
      } catch {
        return null;
      }
    },
    async save(tokens) {
      await adapter.setItemAsync(SESSION_KEY, JSON.stringify(tokens));
    },
    async clear() {
      await adapter.deleteItemAsync(SESSION_KEY);
    },
  };
}
