import * as SecureStore from 'expo-secure-store';

const keyFor = (kind: 'intro' | 'hint' | 'completion', userId: number, suffix = '') =>
  `finance-first-run-v2:${kind}:${userId}${suffix ? `:${suffix}` : ''}`;

export const firstRunStorage = {
  introKey: (userId: number) => keyFor('intro', userId),
  hintKey: (userId: number, hint: string) => keyFor('hint', userId, hint),
  completionKey: (userId: number) => keyFor('completion', userId),
  async read(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async mark(key: string) {
    await SecureStore.setItemAsync(key, 'done');
  },
};
