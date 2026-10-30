import { requireOptionalNativeModule } from 'expo';
import * as AppIntents from 'expo-app-intents';
import { invocationSchema, type NativeIntentBridge } from './native-types';

interface FinanceNativeModule {
  setOwnerAsync(owner: string | null): Promise<void>;
  pendingAsync(owner: string): Promise<string>;
  completeAsync(owner: string, id: string): Promise<void>;
}
const native = requireOptionalNativeModule<FinanceNativeModule>('AppIntentsSetup');
let ownerWrites: Promise<void> = Promise.resolve();
export const nativeIntentBridge: NativeIntentBridge = {
  available: Boolean(native && AppIntents.isAvailable()),
  setOwner: async (owner) => {
    const next = ownerWrites.then(async () => {
      await native?.setOwnerAsync(owner);
    });
    ownerWrites = next.catch(() => {});
    await next;
  },
  pending: async (owner) =>
    invocationSchema.array().parse(JSON.parse((await native?.pendingAsync(owner)) ?? '[]')),
  complete: async (owner, id) => {
    await native?.completeAsync(owner, id);
  },
  listen(wake) {
    const subscription = AppIntents.addAppIntentListener((signal) => {
      wake();
      if (signal.name === 'financePending')
        void AppIntents.removePendingInvocationAsync(signal.id).catch(() => {});
    });
    // Expo carries content-free notifications only. The durable financial queue is in Keychain.
    void AppIntents.getPendingInvocationsAsync()
      .then(async (signals) => {
        for (const signal of signals) {
          if (signal.name === 'financePending') await AppIntents.removePendingInvocationAsync(signal.id);
        }
      })
      .catch(() => {
        /* A missed wake-up is recovered by pending() on focus. */
      });
    return subscription;
  },
};
