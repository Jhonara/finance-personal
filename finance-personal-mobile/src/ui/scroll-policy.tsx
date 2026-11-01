import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { createScrollCoordinator } from './scroll-coordinator';

const ScrollContext = createContext<ReturnType<typeof createScrollCoordinator> | null>(null);
export function ScrollPolicyProvider({ children }: PropsWithChildren) {
  const coordinator = useMemo(createScrollCoordinator, []);
  return <ScrollContext.Provider value={coordinator}>{children}</ScrollContext.Provider>;
}
export function useTabScrollToTop() {
  return useContext(ScrollContext)?.toTop;
}
export function useScrollCoordinator() {
  return useContext(ScrollContext);
}
