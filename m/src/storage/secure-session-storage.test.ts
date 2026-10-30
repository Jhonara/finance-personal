import { describe, expect, it } from 'vitest';

import { createSecureSessionStorage } from './session-storage-core';

function createAdapter() {
  let value: string | null = null;
  return {
    getItemAsync: async () => value,
    setItemAsync: async (_key: string, nextValue: string) => {
      value = nextValue;
    },
    deleteItemAsync: async () => {
      value = null;
    },
  };
}

describe('secure session storage', () => {
  it('serializes, restores and clears one token bundle', async () => {
    const storage = createSecureSessionStorage(createAdapter());
    const tokens = { accessToken: 'access', refreshToken: 'refresh', tokenType: 'Bearer', expiresIn: 900 };

    await storage.save(tokens);
    await expect(storage.load()).resolves.toEqual(tokens);
    await storage.clear();
    await expect(storage.load()).resolves.toBeNull();
  });
});
