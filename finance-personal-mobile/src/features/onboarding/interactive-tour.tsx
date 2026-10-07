import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, usePathname } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useFeedback } from '@/feedback/feedback-provider';
import { Button } from '@/ui/primitives';
import { JourneyScene } from '@/ui/journey-scene';
import { BrandMascot } from '@/ui/brand-media';
import { colors, spacing, typography } from '@/theme';
import { TourContext } from './tour-context';
import { parseTourProgress, tourKey, tourSteps } from './tour-steps';

export function InteractiveTourProvider({ children }: PropsWithChildren) {
  const user = useCurrentUser();
  return (
    <UserTour key={user.data?.id ?? 'anonymous'} userId={user.data?.id}>
      {children}
    </UserTour>
  );
}

function UserTour({ userId, children }: PropsWithChildren<{ userId?: number }>) {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [target, setTarget] = useState('');
  const reportTarget = useCallback(
    (id: string, present: boolean) => setTarget((value) => (present ? id : value === id ? '' : value)),
    [],
  );
  const lock = useRef(false);
  const mounted = useRef(true);
  const path = usePathname();
  const feedback = useFeedback();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const current = tourSteps[step]!;
  useEffect(() => {
    if (!active || path === current.path) return;
    const timer = setTimeout(() => setActive(false), 1200);
    return () => clearTimeout(timer);
  }, [active, path, current.path]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      setActive(false);
      return true;
    });
    return () => listener.remove();
  }, [active]);
  const start = async (restart = false) => {
    if (!userId || lock.current) return;
    lock.current = true;
    try {
      const progress = parseTourProgress(await SecureStore.getItemAsync(tourKey(userId)));
      if (!mounted.current) return;
      const next = restart || progress.done ? 0 : progress.step;
      await SecureStore.setItemAsync(tourKey(userId), JSON.stringify({ step: next, done: false }));
      if (!mounted.current) return;
      setStep(next);
      setError('');
      setActive(true);
      router.navigate(tourSteps[next]!.route);
    } catch {
      if (mounted.current) feedback.show('No pudimos abrir el recorrido. Inténtalo otra vez.', 'error');
    } finally {
      lock.current = false;
    }
  };
  const move = async (next: number, done = false) => {
    if (!userId || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await SecureStore.setItemAsync(tourKey(userId), JSON.stringify({ step: next, done }));
      if (!mounted.current) return;
      setStep(next);
      if (done) {
        setActive(false);
        router.navigate('/(app)');
      } else router.navigate(tourSteps[next]!.route);
    } catch {
      if (mounted.current) setError('No pudimos guardar el paso. Reintenta o cierra el recorrido.');
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const visible = active && path === current.path;
  const pause = () => setActive(false);
  return (
    <TourContext.Provider
      value={{
        active: visible,
        activeTarget: visible ? current.target : undefined,
        start: (restart) => void start(restart),
        pause,
        reportTarget,
      }}
    >
      {children}
      {visible && (
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'flex-end', paddingHorizontal: 14, paddingBottom: insets.bottom + 88 },
          ]}
        >
          <JourneyScene revision={current.id}>
            <View style={[styles.card, { maxHeight: height * 0.46 }]}>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.content}>
                <View style={styles.heading}>
                  <BrandMascot size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eyebrow}>
                      RECORRIDO · {step + 1}/{tourSteps.length}
                    </Text>
                    <Text
                      accessibilityRole="header"
                      accessibilityLiveRegion="polite"
                      style={typography.cardTitle}
                    >
                      {current.title}
                    </Text>
                  </View>
                  <Ionicons name={current.icon} size={24} color={colors.success} />
                </View>
                <Text style={typography.body}>{current.copy}</Text>
                <Text style={typography.caption}>
                  {target === current.target
                    ? 'Toca la zona resaltada para explorar. El recorrido se pausa y puedes retomarlo desde Inicio.'
                    : 'Si aún no tienes datos aquí, puedes continuar. El recorrido no exige crear registros.'}
                </Text>
                {!!error && (
                  <Text
                    accessibilityLiveRegion="polite"
                    style={{ ...typography.caption, color: colors.danger }}
                  >
                    {error}
                  </Text>
                )}
              </ScrollView>
              <View style={styles.footer}>
                <View style={styles.actions}>
                  {step > 0 && (
                    <View style={{ flex: 1 }}>
                      <Button variant="secondary" disabled={busy} onPress={() => void move(step - 1)}>
                        Anterior
                      </Button>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Button
                      loading={busy}
                      onPress={() =>
                        void move(Math.min(step + 1, tourSteps.length - 1), step === tourSteps.length - 1)
                      }
                    >
                      {step === tourSteps.length - 1 ? 'Terminar' : 'Siguiente'}
                    </Button>
                  </View>
                </View>
                <Button variant="ghost" disabled={busy} onPress={pause}>
                  Salir y explorar
                </Button>
              </View>
            </View>
          </JourneyScene>
        </View>
      )}
    </TourContext.Provider>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.surface,
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
  },
  content: { padding: spacing.lg, gap: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: { ...typography.caption, color: colors.success, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
