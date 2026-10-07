import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  guideKey,
  guideTopics,
  isGuideTopic,
  parseGuideProgress,
  type GuideProgress,
  type GuideTopicId,
} from '@/features/onboarding/ecosystem-guide';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useQuickActions } from '@/features/quick-actions/quick-action-provider';
import { openForm } from '@/features/forms/form-session';
import { JourneyScene } from '@/ui/journey-scene';
import { BrandMascot } from '@/ui/brand-media';
import { Button, Card, Screen } from '@/ui/primitives';
import { MotionPressable } from '@/ui/motion';
import { ScreenHeader } from '@/ui/headers';
import { Progress } from '@/ui/progress';
import { ErrorState, Skeleton } from '@/ui/states';
import { colors, radius, spacing, typography } from '@/theme';
import { useTour } from '@/features/onboarding/tour-context';

export default function GuideScreen() {
  const user = useCurrentUser();
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  if (!user.data?.id)
    return (
      <Screen>
        {user.isPending ? <Skeleton height={220} /> : <ErrorState onRetry={() => void user.refetch()} />}
      </Screen>
    );
  return <UserGuide key={user.data.id} userId={user.data.id} topic={topic} />;
}

function UserGuide({ userId, topic }: { userId: number; topic?: string }) {
  const progress = useQuery({
    queryKey: ['start-guide', userId],
    queryFn: async () => parseGuideProgress(await SecureStore.getItemAsync(guideKey(userId))),
    retry: false,
  });
  if (!progress.data)
    return (
      <Screen>
        <ScreenHeader title="Guía de inicio" back onBack={() => router.back()} />
        {progress.isPending ? (
          <Skeleton height={260} />
        ) : (
          <ErrorState title="No pudimos abrir tu guía" onRetry={() => void progress.refetch()} />
        )}
      </Screen>
    );
  return <GuideJourney key={topic ?? 'resume'} userId={userId} initial={progress.data} topic={topic} />;
}

function GuideJourney({
  userId,
  initial,
  topic,
}: {
  userId: number;
  initial: GuideProgress;
  topic?: string;
}) {
  const client = useQueryClient();
  const tour = useTour();
  const { open } = useQuickActions();
  const [progress, setProgress] = useState(initial);
  const [selected, setSelected] = useState<GuideTopicId>(isGuideTopic(topic) ? topic : initial.lastTopic);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const current = guideTopics.find((item) => item.id === selected)!;
  const index = guideTopics.indexOf(current);
  const choose = (id: GuideTopicId) => {
    setSelected(id);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const next = async () => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError('');
    const nextTopic = guideTopics[index + 1]?.id ?? current.id;
    const updated: GuideProgress = {
      reviewed: [...new Set([...progress.reviewed, current.id])],
      lastTopic: nextTopic,
    };
    try {
      await SecureStore.setItemAsync(guideKey(userId), JSON.stringify(updated));
      setProgress(updated);
      client.setQueryData(['start-guide', userId], updated);
      if (index < guideTopics.length - 1) choose(nextTopic);
    } catch {
      setError('No pudimos guardar tu recorrido. Puedes reintentar o seguir explorando los temas.');
    } finally {
      setSaving(false);
      lock.current = false;
    }
  };
  const launch = () => {
    if (current.route === 'quick-action') open();
    else if (current.route === '/(app)/new-transfer') openForm(current.route);
    else router.push(current.route);
  };
  const complete = progress.reviewed.length === guideTopics.length;
  return (
    <Screen>
      <ScreenHeader title="Guía de inicio" subtitle="Aprende a tu ritmo" back onBack={() => router.back()} />
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        {tour && (
          <Button variant="secondary" onPress={() => tour.start(true)}>
            Mostrarme los botones: iniciar recorrido
          </Button>
        )}
        <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={styles.hero}>
          <View style={styles.heading}>
            <BrandMascot size={58} />
            <View style={styles.grow}>
              <Text style={styles.eyebrow}>TU DINERO, PASO A PASO</Text>
              <Text style={styles.title}>
                {complete ? 'Tu recorrido está completo' : 'Un buen comienzo, contigo'}
              </Text>
            </View>
          </View>
          <Text style={styles.heroCopy}>
            Empieza por cuentas y movimientos. Después explora lo que necesites: ahorrar, organizar gastos o
            seguir tus préstamos.
          </Text>
          <Progress
            value={(progress.reviewed.length * 100) / guideTopics.length}
            label={`${progress.reviewed.length} de ${guideTopics.length} temas recorridos`}
            color={colors.mint}
          />
          <Text accessibilityLiveRegion="polite" style={styles.heroCopy}>
            {progress.reviewed.length} de {guideTopics.length} temas recorridos · no son tareas financieras
          </Text>
        </LinearGradient>
        <Text style={typography.caption}>
          Puedes salir cuando quieras y retomar desde Inicio, Plan o Perfil y ajustes.
        </Text>
        <JourneyScene revision={selected}>
          <Card style={styles.chapter}>
            <View style={styles.heading}>
              <View style={styles.icon}>
                <Ionicons name={current.icon} size={27} color={colors.primary} />
              </View>
              <View style={styles.grow}>
                <Text style={styles.step}>
                  TEMA {index + 1} DE {guideTopics.length}
                </Text>
                <Text accessibilityRole="header" style={typography.sectionTitle}>
                  {current.title}
                </Text>
              </View>
            </View>
            <Text style={typography.bodySecondary}>{current.intro}</Text>
            {current.steps.map((step, number) => (
              <View key={step} style={styles.instruction}>
                <View style={styles.number}>
                  <Text style={typography.label}>{number + 1}</Text>
                </View>
                <Text style={[typography.body, styles.grow]}>{step}</Text>
              </View>
            ))}
            <View style={styles.tip}>
              <Ionicons name="bulb-outline" size={22} color={colors.success} />
              <Text style={[typography.caption, styles.grow]}>{current.tip}</Text>
            </View>
            <Button variant="secondary" onPress={launch}>
              {current.action} →
            </Button>
            <Text style={typography.caption}>
              Abrir el módulo no marca este tema como leído ni registra datos.
            </Text>
            {!!error && (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            )}
            <Button loading={saving} onPress={() => void next()}>
              {index === guideTopics.length - 1 ? 'Marcar tema como leído' : 'Entendido, siguiente tema'}
            </Button>
            {index > 0 && (
              <Button variant="ghost" disabled={saving} onPress={() => choose(guideTopics[index - 1]!.id)}>
                Tema anterior
              </Button>
            )}
          </Card>
        </JourneyScene>
        {complete && <Button onPress={() => router.replace('/(app)')}>Listo, ir a Inicio</Button>}
        <Text accessibilityRole="header" style={typography.sectionTitle}>
          Todos los temas
        </Text>
        {guideTopics.map((item, i) => (
          <MotionPressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Tema ${i + 1}: ${item.title}`}
            accessibilityState={{ selected: selected === item.id, disabled: saving }}
            disabled={saving}
            onPress={() => choose(item.id)}
            style={[styles.topic, selected === item.id && styles.activeTopic]}
          >
            <Ionicons name={item.icon} size={23} color={colors.primary} />
            <View style={styles.grow}>
              <Text style={typography.label}>
                {i + 1}. {item.title}
              </Text>
              <Text style={typography.caption}>{item.short}</Text>
            </View>
            <Ionicons
              name={progress.reviewed.includes(item.id) ? 'checkmark-circle' : 'chevron-forward'}
              size={22}
              color={progress.reviewed.includes(item.id) ? colors.success : colors.textMuted}
            />
          </MotionPressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingVertical: spacing.lg },
  hero: { borderRadius: 26, padding: spacing.xl, gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.caption, color: colors.mint, fontWeight: '700' },
  title: { ...typography.sectionTitle, color: colors.surface },
  heroCopy: { ...typography.caption, color: '#D8F0EA' },
  chapter: { padding: spacing.lg, gap: spacing.lg },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: { ...typography.caption, color: colors.success, fontWeight: '700' },
  instruction: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  number: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.medium,
  },
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 64,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTopic: { borderColor: colors.success, backgroundColor: colors.primarySoft },
  error: { ...typography.caption, color: colors.danger },
});
