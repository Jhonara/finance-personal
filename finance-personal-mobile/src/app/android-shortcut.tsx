import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/auth-provider';
import { toApiError } from '@/api/errors';
import { getCurrentUser } from '@/features/profile/profile-api';
import { launcherDestination } from '@/features/launcher-shortcuts/destinations';
import { Button, Screen } from '@/ui/primitives';
import { EmptyState, SkeletonRow } from '@/ui/states';
import LoginScreen from './(auth)/login';

/** Public gate: the action stays in the route during login; financial screens mount only after /me. */
export default function AndroidShortcutScreen() {
  const { action } = useLocalSearchParams<{ action?: string | string[] }>();
  const destination = Platform.OS === 'android' ? launcherDestination(action) : undefined;
  const { state, logout } = useAuth();
  const client = useQueryClient();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!destination || state.status !== 'authenticated') return;
    let active = true;
    void (async () => {
      try {
        // Uses the existing JWT refresh coordinator. A cached authenticated UI is not proof of a live session.
        await getCurrentUser();
        if (!active) return;
        if (destination === '/(app)/accounts') {
          await Promise.all([
            client.invalidateQueries({ queryKey: ['accounts'], refetchType: 'none' }),
            client.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'none' }),
          ]);
          if (active) router.replace(destination);
        } else {
          // One navigation operation is essential on a cold Android launch. A replace
          // followed immediately by push can race while the tab navigator mounts and
          // leave the user on Home instead of the requested form.
          router.replace({ pathname: destination, params: { formSession: `launcher-${Date.now()}` } });
        }
      } catch (failure) {
        if (!active) return;
        if (toApiError(failure).status === 401) {
          // Clears stale user caches as well as the expired session. The URL retains only the chosen action.
          await logout().catch(() => undefined);
        } else {
          setError(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [destination, state, logout, client, attempt]);

  if (!destination)
    return (
      <Screen>
        <EmptyState title="Acceso no disponible" description="Abre Finance Personal para continuar." />
        <Button onPress={() => router.replace('/')}>Ir a Finance Personal</Button>
      </Screen>
    );
  if (state.status === 'unauthenticated') return <LoginScreen />;
  if (error)
    return (
      <Screen>
        <EmptyState
          title="No pudimos comprobar tu sesión"
          description="Revisa la conexión e inténtalo de nuevo. Tu acción sigue pendiente."
        />
        <Button
          onPress={() => {
            setError(false);
            setAttempt((value) => value + 1);
          }}
        >
          Reintentar
        </Button>
        <Button variant="ghost" onPress={() => router.replace('/')}>
          Cancelar
        </Button>
      </Screen>
    );
  return (
    <Screen>
      <SkeletonRow />
    </Screen>
  );
}
