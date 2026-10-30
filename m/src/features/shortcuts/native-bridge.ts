import type { NativeIntentBridge } from './native-types';

// Android/web keep their existing flows; no iOS native imports or side effects.
export const nativeIntentBridge: NativeIntentBridge = {
  available: false,
  setOwner: async () => {},
  pending: async () => [],
  complete: async () => {},
  listen: () => ({ remove() {} }),
};
