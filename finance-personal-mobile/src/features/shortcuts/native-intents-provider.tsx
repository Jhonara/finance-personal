import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, useAuth } from '@/auth/auth-provider';
import { getCurrentUser } from '@/features/profile/profile-api';
import { openForm } from '@/features/forms/form-session';
import { requestFormExit } from '@/features/forms/use-unsaved-form';
import { AppAlert } from '@/feedback/app-alert';
import { toApiError } from '@/api/errors';
import { nativeIntentBridge as bridge } from './native-bridge';
import { processNativePurchase } from './native-processor';
import type { NativeInvocation } from './native-types';
import { nativeEntryRoute, hasOpenedNativeRoute } from './native-entry';

type NativeState = {
  available: boolean;
  pending: NativeInvocation[];
  error: string;
  busy: boolean;
  requiresLogin: boolean;
  retry(): void;
  discard(id: string): Promise<void>;
};
const empty: NativeState = {
  available: false,
  pending: [],
  error: '',
  busy: false,
  requiresLogin: false,
  retry() {},
  async discard() {},
};
const Context = createContext<NativeState>(empty);
export const useNativeIntents = () => useContext(Context);

export function NativeIntentsProvider({ children }: PropsWithChildren) {
  const { state } = useAuth();
  const client = useQueryClient();
  const [pending, setPending] = useState<NativeInvocation[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const session = useRef(state);
  const owner = useRef<string | null>(null);
  const lock = useRef(false);
  const retryQueued = useRef(false);
  const pathname = usePathname();
  const [opening, setOpening] = useState<{ id: string; owner: string; route: string }>();
  useEffect(() => {
    session.current = state;
  }, [state]);

  const retry = useCallback(async () => {
    if (!bridge.available || session.current.status !== 'authenticated') return;
    if (lock.current) {
      retryQueued.current = true;
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    setRequiresLogin(false);
    const startedSession = session.current;
    const isCurrent = () => session.current === startedSession;
    try {
      const user = await getCurrentUser();
      if (!isCurrent() || !user.id) return;
      const id = String(user.id);
      owner.current = id;
      await bridge.setOwner(id);
      if (!isCurrent()) return;
      const invocations = await bridge.pending(id);
      setPending(invocations);
      let latestDraft: number | undefined;
      for (const invocation of invocations) {
        if (!isCurrent()) return;
        const entryRoute = nativeEntryRoute(invocation, id);
        if (entryRoute) {
          if (entryRoute === '/(app)/accounts') await client.invalidateQueries({ queryKey: ['dashboard'] });
          requestFormExit(() => {
            if (!isCurrent()) return;
            setOpening({ id: invocation.id, owner: id, route: entryRoute });
            if (entryRoute === '/(app)/accounts') router.push(entryRoute);
            else openForm(entryRoute);
          });
          return; // The destination must appear before acknowledging this navigation action.
        }
        const receipt = await processNativePurchase(invocation, id, {
          bridge,
          isCurrent,
          commit: async (input) => (await api.post('/inbox/native', input)).data,
        });
        if (receipt?.status === 'PENDING') latestDraft = receipt.id;
      }
      if (!isCurrent()) return;
      setPending(await bridge.pending(id));
      await client.invalidateQueries({ queryKey: ['inbox'] });
      if (latestDraft) {
        const draftId = latestDraft;
        AppAlert.alert('Compra por revisar', 'Los datos están guardados. Tu saldo aún no cambia.', [
          { text: 'Después', style: 'cancel' },
          {
            text: 'Revisar',
            onPress: () => requestFormExit(() => openForm('/(app)/purchase-review', { id: String(draftId) })),
          },
        ]);
      }
    } catch (failure) {
      if (!isCurrent()) return;
      const apiError = toApiError(failure);
      setRequiresLogin(apiError.status === 401);
      const message =
        apiError.status === 401
          ? 'Tu sesión venció. Vuelve a iniciar sesión con el mismo usuario; la acción sigue pendiente.'
          : 'La acción sigue guardada en este iPhone. Revisa la conexión y los datos del atajo, y vuelve a intentarlo.';
      setError(message);
      AppAlert.alert('Acción pendiente', message, [
        { text: 'Después', style: 'cancel' },
        { text: 'Ver pendientes', onPress: () => requestFormExit(() => router.push('/(app)/shortcuts')) },
      ]);
    } finally {
      lock.current = false;
      setBusy(false);
      if (retryQueued.current) {
        retryQueued.current = false;
        setTimeout(() => {
          void retry();
        }, 0);
      }
    }
  }, [client]);

  useEffect(() => {
    if (
      !opening ||
      state.status !== 'authenticated' ||
      owner.current !== opening.owner ||
      !hasOpenedNativeRoute(pathname, opening.route)
    )
      return;
    const startedSession = session.current;
    void bridge
      .complete(opening.owner, opening.id)
      .then(async () => {
        if (session.current !== startedSession) return;
        setPending(await bridge.pending(opening.owner));
        setOpening(undefined);
      })
      .catch(() =>
        setError('La pantalla se abrió. La acción sigue pendiente de cerrar; puedes volver a intentarlo.'),
      );
  }, [opening, pathname, state]);

  useEffect(() => {
    if (!bridge.available) return;
    if (state.status !== 'authenticated') {
      owner.current = null;
      setPending([]);
      setError('');
      if (state.status === 'unauthenticated') void bridge.setOwner(null).catch(() => {});
      return;
    }
    const subscription = bridge.listen(() => {
      void retry();
    });
    const appState = AppState.addEventListener('change', (value) => {
      if (value === 'active') void retry();
    });
    void retry();
    return () => {
      subscription.remove();
      appState.remove();
    };
  }, [state, retry]);

  const discard = async (id: string) => {
    const currentOwner = owner.current;
    if (!currentOwner || lock.current) return;
    await bridge.complete(currentOwner, id);
    setPending(await bridge.pending(currentOwner));
  };
  return (
    <Context.Provider
      value={{
        available: bridge.available,
        pending,
        error,
        busy,
        requiresLogin,
        retry: () => {
          void retry();
        },
        discard,
      }}
    >
      {children}
    </Context.Provider>
  );
}
