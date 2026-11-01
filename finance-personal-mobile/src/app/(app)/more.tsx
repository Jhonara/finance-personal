import { themedStyleSheet } from '@/theme/themed-styles';
import { useRef, useState, type PropsWithChildren } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { AppAlert as Alert } from '@/feedback/app-alert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTour } from '@/features/onboarding/tour-context';
import { TourTarget } from '@/ui/tour-target';
import Constants from 'expo-constants';
import { useAuth } from '@/auth/auth-provider';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { profileInitials, preferredUserName } from '@/features/profile/profile-presentation';
import { openForm } from '@/features/forms/form-session';
import { usePrivacy } from '@/privacy/privacy-provider';
import { useFeedback } from '@/feedback/feedback-provider';
import { BrandMark } from '@/ui/brand-identity';
import { ScreenHeader } from '@/ui/headers';
import { Card, Screen } from '@/ui/primitives';
import { SettingsRow } from '@/ui/settings-row';
import { Disclosure } from '@/ui/disclosure';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { colors, radius, spacing, typography } from '@/theme';
import { useAppTheme, type AppearanceMode } from '@/theme/theme-provider';
import { MotionPressable } from '@/ui/motion';
import { HomePrioritySettings } from '@/features/dashboard/home-priority-settings';
import { HomeUpcomingSettings } from '@/features/dashboard/home-upcoming';
import { HomeShortcutSettings } from '@/features/dashboard/home-shortcut-settings';
import { homeWidgetBridge } from '@/features/widget/home-widget-bridge';
import { DetectedNoticeSettings } from '@/features/capture/detected-notice-settings';
import { captureQaEnabled } from '@/features/capture/capture-diagnostics';

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const { palette } = useAppTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={[typography.sectionTitle, { color: palette.textPrimary }]}>
        {title}
      </Text>
      <Card style={{ paddingHorizontal: spacing.md }}>{children}</Card>
    </View>
  );
}
export default function MoreScreen() {
  const { mode, palette, setMode } = useAppTheme();
  const tour = useTour();
  const profile = useCurrentUser();
  const { logout, logoutAll } = useAuth();
  const { hidden, toggle } = usePrivacy();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const privacyLock = useRef(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(() => homeWidgetBridge.getVisible());
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
    <Screen entry scroll style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Perfil y ajustes"
        subtitle="Tu espacio y tus preferencias."
        back
        onBack={() => router.back()}
      />
      <Section title="Mi información">
        {profile.isPending ? (
          <SkeletonRow />
        ) : profile.isError ? (
          <ErrorState title="No pudimos cargar tu perfil" onRetry={() => void profile.refetch()} />
        ) : (
          <>
            <View style={styles.profileRow}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.avatar}
              >
                <Text style={[typography.sectionTitle, { color: '#FFFFFF' }]}>
                  {profileInitials(profile.data.name)}
                </Text>
              </View>
              <View style={styles.profileCopy}>
                <Text style={styles.eyebrow}>TU ESPACIO</Text>
                <Text style={typography.sectionTitle}>{profile.data.name || 'Tu perfil'}</Text>
              </View>
              <BrandMark size={36} />
            </View>
            {!!profile.data.email && (
              <Text style={[typography.bodySecondary, { flexShrink: 1 }]}>{profile.data.email}</Text>
            )}
            <Text style={typography.caption}>
              Nombre mostrado: {preferredUserName(profile.data) ?? 'Aún sin definir'}
            </Text>
            <SettingsRow
              icon="person-outline"
              title="Editar mi información"
              subtitle="Nombre, apellidos y cómo prefieres que te llamemos."
              onPress={() => openForm('/(app)/profile-form')}
            />
          </>
        )}
      </Section>
      <Section title="Apariencia">
        <View style={styles.appearance}>
          <View style={styles.appearanceTitle}>
            <View style={[styles.appearanceIcon, { backgroundColor: palette.infoSoft }]}>
              <Ionicons name="contrast-outline" size={21} color={palette.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>Apariencia</Text>
              <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
                Elige cómo se ve la app.
              </Text>
            </View>
          </View>
          <View style={[styles.appearanceOptions, { backgroundColor: palette.surfaceSecondary }]}>
            {(
              [
                ['system', 'Sistema'],
                ['light', 'Claro'],
                ['dark', 'Oscuro'],
              ] as const
            ).map(([value, label]) => (
              <MotionPressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Tema ${label.toLowerCase()}`}
                accessibilityState={{ selected: mode === value }}
                onPress={() =>
                  void setMode(value as AppearanceMode).catch(() =>
                    feedback.show('No pudimos guardar la apariencia.', 'error'),
                  )
                }
                style={[
                  styles.appearanceChoice,
                  mode === value && { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <Text
                  style={[
                    typography.label,
                    { color: mode === value ? palette.textPrimary : palette.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </MotionPressable>
            ))}
          </View>
        </View>
      </Section>
      <Section title="Privacidad">
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
              trackColor={{ true: palette.primaryStrong, false: palette.border }}
            />
          }
        />
        {homeWidgetBridge.available ? (
          <SettingsRow
            icon="phone-portrait-outline"
            title="Mostrar montos en el widget"
            subtitle="Desactivado por defecto. También se ocultan si activas «Ocultar importes» en la app."
            control={
              <Switch
                accessibilityRole="switch"
                accessibilityLabel="Mostrar montos en el widget"
                accessibilityHint="Permite ver saldos, ingresos y gastos en el widget de Android."
                accessibilityState={{ checked: widgetVisible }}
                value={widgetVisible}
                onValueChange={(next) => {
                  try {
                    homeWidgetBridge.setVisible(next);
                    setWidgetVisible(next);
                  } catch {
                    feedback.show('No pudimos cambiar la privacidad del widget.', 'error');
                  }
                }}
                trackColor={{ true: palette.primaryStrong, false: palette.border }}
              />
            }
          />
        ) : null}
      </Section>
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={[typography.sectionTitle, { color: palette.textPrimary }]}>
          Personalización
        </Text>
        <Disclosure title="Opciones de Inicio" icon="home-outline">
          <HomePrioritySettings userId={profile.data?.id} />
          <HomeUpcomingSettings userId={profile.data?.id} />
          <HomeShortcutSettings userId={profile.data?.id} />
        </Disclosure>
      </View>
      {(Platform.OS === 'android' || captureQaEnabled) && (
        <Disclosure title="Avisos y captura" icon="notifications-outline">
          <DetectedNoticeSettings />
          {Platform.OS === 'android' && (
            <SettingsRow
              icon="scan-outline"
              title="Lectura de avisos bancarios"
              subtitle="Elige qué avisos de compra quieres revisar."
              onPress={() => router.push('/(app)/capture-notifications')}
            />
          )}
          {captureQaEnabled && (
            <SettingsRow
              icon="pulse-outline"
              title="Diagnóstico de captura"
              subtitle="Permisos, sincronización y pruebas ficticias. Solo desarrollo y QA."
              onPress={() => router.push('/(app)/capture-diagnostics')}
            />
          )}
        </Disclosure>
      )}
      <Section title="Organización">
        <SettingsRow
          icon="pricetags-outline"
          title="Categorías"
          subtitle="Organiza ingresos y gastos."
          onPress={() => router.push('/(app)/categories')}
        />
      </Section>
      <Section title="Ayuda">
        <TourTarget id="profile-guide">
          <SettingsRow
            icon="navigate-circle-outline"
            title="Recorrido interactivo"
            subtitle="Visita cada módulo y prueba sus controles."
            onPress={() => tour?.start()}
          />
          <SettingsRow
            icon="compass-outline"
            title="Ver guía de inicio"
            subtitle="Aprende cada módulo y retoma tu recorrido."
            onPress={() => router.push('/(app)/guide')}
          />
        </TourTarget>
      </Section>
      <Section title="Seguridad y sesiones">
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
    </Screen>
  );
}
const styles = themedStyleSheet(() => ({
  appearance: { paddingVertical: spacing.lg, gap: spacing.md },
  appearanceTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appearanceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceOptions: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, gap: 4 },
  appearanceChoice: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  profileCard: { gap: spacing.md, padding: spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  eyebrow: { ...typography.caption, color: colors.success, fontWeight: '700', letterSpacing: 0.4 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
