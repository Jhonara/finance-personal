import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ComponentType,
  type PropsWithChildren,
} from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

type FormRoute =
  | '/(app)/account-form'
  | '/(app)/account-detail'
  | '/(app)/budget-form'
  | '/(app)/saving-form'
  | '/(app)/new-expense'
  | '/(app)/new-income'
  | '/(app)/new-transfer'
  | '/(app)/category-form'
  | '/(app)/credit-form';
let entry = 0;
/** Explicit entry, unlike returning from a selector or a nested create flow. */
export function openForm(pathname: FormRoute, params: Record<string, string | undefined> = {}) {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) values[key] = value ?? '';
  router.push({
    pathname,
    params: {
      id: '',
      version: '',
      limit: '',
      categoryId: '',
      categoryName: '',
      year: '',
      month: '',
      type: 'EXPENSE',
      ...values,
      formSession: `${Date.now()}-${++entry}`,
    },
  });
}

const SessionContext = createContext<() => boolean>(() => true);
export const useFormSessionActive = () => useContext(SessionContext);
function Session({ children }: PropsWithChildren) {
  const active = useRef(false);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []),
  );
  const isActive = useCallback(() => active.current, []);
  return <SessionContext.Provider value={isActive}>{children}</SessionContext.Provider>;
}

/** Tabs retain routes. Remount only the draft, for a new explicit entry/entity. */
export function withFormSession(Form: ComponentType) {
  return function FormSessionRoute() {
    const {
      formSession = 'initial',
      id = '',
      type = '',
    } = useLocalSearchParams<{ formSession?: string; id?: string; type?: string }>();
    return (
      <Session key={`${formSession}:${id}:${type}`}>
        <Form />
      </Session>
    );
  };
}
