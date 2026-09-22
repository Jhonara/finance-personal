import { useRef, useState, type PropsWithChildren } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/auth-provider';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { profileInitials } from '@/features/profile/profile-presentation';
import { getAlerts } from '@/features/secondary/secondary-api';
import { secondaryKeys } from '@/features/secondary/use-secondary';
import { actionableAlerts } from '@/features/alerts/alert-presentation';
import { usePrivacy } from '@/privacy/privacy-provider';
import { useFeedback } from '@/feedback/feedback-provider';
import { BrandSurface } from '@/ui/brand-surface';
import { ScreenHeader } from '@/ui/headers';
import { Card, Screen } from '@/ui/primitives';
import { SettingsRow } from '@/ui/settings-row';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { FirstRunGuide } from '@/ui/first-run-guide';
import { colors, radius, spacing, typography } from '@/theme';

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        {title}
      </Text>
      <Card style={{ paddingHorizontal: spacing.md }}>{children}</Card>
    </View>
  );
}
export default function MoreScreen() {
  const profile = useCurrentUser();
  const { logout, logoutAll } = useAuth();
  const { hidden, toggle } = usePrivacy();
  const feedback = useFeedback();
  const alerts = useQuery({ queryKey: secondaryKeys.alerts, queryFn: getAlerts, enabled: false });
  const [replay, setReplay] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const privacyLock = useRef(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const closeSession = (all: boolean) => {
    if (lock.current) return;
    lock.current = true;
    Alert.alert(
      all ? '¿Cerrar sesión en todos los dispositivos?' : '¿Cerrar sesión?',
      all
        ? 'Se revocarán todas tus sesiones activas. Tendrás que iniciar sesión nuevamente en tus dispositivos.'
        : 'Podrás volver a entrar con tu correo y contraseña.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => {
            lock.current = false;
          },
        },
        {
          text: all ? 'Cerrar todas las sesiones' : 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void (all ? logoutAll() : logout())
              .catch(() =>
                feedback.show(
                  all
                    ? 'Cerramos tu sesión local, pero no pudimos confirmar el cierre en los demás dispositivos.'
                    : 'Cerramos tu sesión en este dispositivo. No pudimos confirmar el cierre remoto.',
                  'warning',
                ),
              )
              .finally(() => {
                lock.current = false;
                setBusy(false);
              });
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          lock.current = false;
        },
      },
    );
  };
  const changePrivacy = async () => {
    if (privacyLock.current) return;
    privacyLock.current = true;
    setPrivacyBusy(true);
    try {
      await toggle();
    } catch {
      feedback.show('No pudimos guardar tu preferencia de privacidad.', 'error');
    } finally {
      privacyLock.current = false;
      setPrivacyBusy(false);
    }
  };
  return (
    <Screen scroll style={{ gap: spacing.xxl }}>
      <ScreenHeader title="Más" subtitle="Tu perfil, preferencias y accesos." />
      <BrandSurface style={{ gap: spacing.md }}>
        {profile.isPending ? (
          <SkeletonRow />
        ) : profile.isError ? (
          <ErrorState title="No pudimos cargar tu perfil" onRetry={() => void profile.refetch()} />
        ) : (
          <>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.avatar}
            >
              <Text style={[typography.sectionTitle, { color: colors.surface }]}>
                {profileInitials(profile.data.name)}
              </Text>
            </View>
            <Text style={typography.sectionTitle}>{profile.data.name || 'Tu perfil'}</Text>
            {!!profile.data.email && (
              <Text style={[typography.body, { flexShrink: 1 }]}>{profile.data.email}</Text>
            )}
          </>
        )}
      </BrandSurface>
      <Section title="Organiza tu dinero">
        <SettingsRow
          icon="pricetags-outline"
          title="Categorías"
          subtitle="Organiza ingresos y gastos."
          onPress={() => router.push('/(app)/categories')}
        />
        <SettingsRow
          icon="pie-chart-outline"
          tone="warning"
          title="Presupuestos"
          subtitle="Define límites para tu mes."
          onPress={() => router.push('/(app)/budgets')}
        />
        <SettingsRow
          icon="ribbon-outline"
          tone="accent"
          title="Ahorros"
          subtitle="Sigue tus metas y aportes."
          onPress={() => router.push('/(app)/savings')}
        />
        <SettingsRow
          icon="card-outline"
          title="Créditos"
          subtitle="Controla tus deudas y pagos."
          onPress={() => router.push('/(app)/credits')}
        />
      </Section>
      <Section title="Mantente informado">
        <SettingsRow
          icon="notifications-outline"
          tone="info"
          title="Alertas"
          subtitle="Revisa lo que necesita atención."
          badge={alerts.data ? actionableAlerts(alerts.data).length : undefined}
          onPress={() => router.push('/(app)/alerts')}
        />
      </Section>
      <Section title="Preferencias">
        <SettingsRow
          icon="eye-off-outline"
          title="Ocultar importes"
          subtitle="Oculta saldos y montos sensibles en la app."
          control={
            <Switch
              accessibilityRole="switch"
              accessibilityLabel="Ocultar importes"
              accessibilityHint="Oculta saldos y montos sensibles en la app."
              accessibilityState={{ checked: hidden, disabled: privacyBusy }}
              value={hidden}
              disabled={privacyBusy}
              onValueChange={() => void changePrivacy()}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          }
        />
        <SettingsRow
          icon="compass-outline"
          title="Ver guía de inicio"
          subtitle="Vuelve a recorrer la introducción de la app."
          onPress={() => setReplay(true)}
        />
      </Section>
      <Section title="Cuenta">
        <SettingsRow
          icon="log-out-outline"
          title="Cerrar sesión"
          danger
          disabled={busy}
          onPress={() => closeSession(false)}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Cerrar sesión en todos los dispositivos"
          subtitle="Revoca todas tus sesiones activas."
          danger
          disabled={busy}
          onPress={() => closeSession(true)}
        />
      </Section>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <Text style={typography.label}>Finance Personal</Text>
        {Constants.expoConfig?.version && (
          <Text style={typography.caption}>Versión {Constants.expoConfig.version}</Text>
        )}
      </View>
      {replay && <FirstRunGuide replay onClose={() => setReplay(false)} />}
    </Screen>
  );
}
const styles = StyleSheet.create({
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
