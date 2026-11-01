import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

const PRIVACY_KEY = 'finance-personal.privacy-hidden.v1';
type PrivacyContextValue = { hidden: boolean; ready: boolean; toggle(): Promise<void> };
const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: PropsWithChildren) {
  // Keep amounts private until the saved preference is known. A cold start must
  // not briefly reveal balances that the person previously chose to hide.
  const [hidden, setHidden] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void SecureStore.getItemAsync(PRIVACY_KEY)
      .then((value) => setHidden(value === 'true'))
      .catch(() => setHidden(true))
      .finally(() => setReady(true));
  }, []);
  const value = useMemo(
    () => ({
      hidden,
      ready,
      async toggle() {
        const next = !hidden;
        setHidden(next);
        await SecureStore.setItemAsync(PRIVACY_KEY, String(next));
      },
    }),
    [hidden, ready],
  );
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyContextValue {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error('usePrivacy must be used within PrivacyProvider.');
  return context;
}
