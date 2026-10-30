import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useFeedback } from '@/feedback/feedback-provider';
import { SettingsRow } from '@/ui/settings-row';
import { spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/theme-provider';
import {
  defaultNoticePreferences,
  getNoticePreferences,
  requestNoticePermission,
  saveNoticePreferences,
  type NoticePreferences,
} from './detected-notices';

export function DetectedNoticeSettings() {
  const user = useCurrentUser();
  const feedback = useFeedback();
  const { palette } = useAppTheme();
  const ownerId = user.data?.id ? String(user.data.id) : '';
  const [prefs, setPrefs] = useState<NoticePreferences>(defaultNoticePreferences);
  const [ready, setReady] = useState(false);
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReady(false);
    setPrefs(defaultNoticePreferences);
    if (!ownerId) return;
    let active = true;
    void Promise.all([getNoticePreferences(ownerId), Notifications.getPermissionsAsync()]).then(
      ([next, permission]) => {
        if (!active) return;
        setPrefs(next);
        setGranted(permission.granted);
        setReady(true);
      },
    );
    return () => {
      active = false;
    };
  }, [ownerId]);
  useEffect(() => {
    if (Platform.OS !== 'android' || !ownerId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        void Notifications.getPermissionsAsync().then((permission) => setGranted(permission.granted));
    });
    return () => subscription.remove();
  }, [ownerId]);

  if (Platform.OS !== 'android' || !ownerId || !ready) return null;
  const change = async (patch: Partial<NoticePreferences>) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = { ...prefs, ...patch };
      if (patch.enabled === true) {
        const allowed = await requestNoticePermission();
        setGranted(allowed);
        if (!allowed)
          feedback.show('Android no permite avisos. Los movimientos seguirán en Por revisar.', 'warning');
      }
      await saveNoticePreferences(ownerId, next);
      setPrefs(next);
    } catch {
      feedback.show('No pudimos guardar los avisos. Reintenta.', 'error');
    } finally {
      setBusy(false);
    }
  };
  const toggle = (label: string, value: boolean, onValueChange: (next: boolean) => void) => (
    <Switch
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: busy }}
      value={value}
      disabled={busy}
      onValueChange={onValueChange}
      trackColor={{ true: palette.primaryStrong, false: palette.border }}
    />
  );
  return (
    <View style={{ gap: spacing.xs }}>
      <SettingsRow
        icon="notifications-outline"
        title="Avisos de movimientos detectados"
        subtitle="Permiso para mostrar avisos; separado del acceso a avisos bancarios."
        control={toggle(
          'Avisos de movimientos detectados',
          prefs.enabled,
          (value) => void change({ enabled: value }),
        )}
      />
      {prefs.enabled && (
        <>
          {!granted && (
            <Text style={typography.caption}>
              Android bloquea los avisos. Tus pendientes se guardan igualmente.
            </Text>
          )}
          {!granted && (
            <SettingsRow
              icon="settings-outline"
              title="Abrir permisos de Android"
              subtitle="Permite mostrar los avisos desde los ajustes del teléfono."
              onPress={() => void Linking.openSettings()}
            />
          )}
          <SettingsRow
            icon="cash-outline"
            title="Mostrar importe en el aviso"
            subtitle="Oculto por defecto; puede verse en la pantalla bloqueada."
            control={toggle(
              'Mostrar importe en el aviso',
              prefs.showAmount,
              (value) => void change({ showAmount: value }),
            )}
          />
          <SettingsRow
            icon="storefront-outline"
            title="Mostrar comercio en el aviso"
            subtitle="Oculto por defecto; se omiten textos que parezcan datos sensibles."
            control={toggle(
              'Mostrar comercio en el aviso',
              prefs.showMerchant,
              (value) => void change({ showMerchant: value }),
            )}
          />
        </>
      )}
    </View>
  );
}
