import { useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import { AppAlert as Alert } from '@/feedback/app-alert';
import { router, useFocusEffect } from 'expo-router';

const activeGuards: { current: () => boolean; request: (leave: () => void) => void }[] = [];
export function requestFormExit(leave: () => void) {
  const guard = [...activeGuards].reverse().find((item) => item.current());
  if (guard) guard.request(leave);
  else leave();
}

export function hasFormChanges(values: unknown, initial: unknown): boolean {
  const normalize = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, normalize(v)]),
    );
  };
  return JSON.stringify(normalize(values)) !== JSON.stringify(normalize(initial));
}

export function useUnsavedForm({
  dirty,
  busy = false,
  suspended = false,
  enabled = true,
  onBack = () => router.back(),
  onStepBack,
}: {
  dirty: boolean;
  busy?: boolean;
  suspended?: boolean;
  enabled?: boolean;
  onBack?: () => void;
  onStepBack?: () => void;
}) {
  const latest = useRef({ dirty, busy, suspended, enabled, onBack, onStepBack });
  latest.current = { dirty, busy, suspended, enabled, onBack, onStepBack };
  const focused = useRef(false);
  const showing = useRef(false);
  const request = useCallback((leave: () => void) => {
    if (latest.current.busy || showing.current) return;
    if (!latest.current.enabled || !latest.current.dirty) {
      leave();
      return;
    }
    showing.current = true;
    Alert.alert(
      '¿Salir sin guardar?',
      'Los cambios de este formulario todavía no se han guardado.',
      [
        {
          text: 'Seguir editando',
          style: 'cancel',
          onPress: () => {
            showing.current = false;
          },
        },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            showing.current = false;
            if (focused.current && !latest.current.busy) leave();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          showing.current = false;
        },
      },
    );
  }, []);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      const entry = {
        current: () => latest.current.enabled && (latest.current.dirty || latest.current.busy),
        request,
      };
      activeGuards.push(entry);
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        const current = latest.current;
        if (!current.enabled || current.suspended) return false;
        if (current.busy) return true;
        if (current.onStepBack) current.onStepBack();
        else request(current.onBack);
        return true;
      });
      return () => {
        focused.current = false;
        showing.current = false;
        subscription.remove();
        const index = activeGuards.indexOf(entry);
        if (index !== -1) activeGuards.splice(index, 1);
      };
    }, [request]),
  );
  return { request };
}
