import { themedStyleSheet } from '@/theme/themed-styles';
import { openForm } from '@/features/forms/form-session';
import { TourTarget } from '@/ui/tour-target';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSavings } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { IconButton, Screen } from '@/ui/primitives';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { colors, radius, spacing, typography } from '@/theme';
import { SavingGoalCard } from '@/features/savings/saving-goal-card';
import { SavingGoalStarter } from '@/features/savings/saving-goal-starter';
import { savingsSummary } from '@/features/savings/savings-presentation';
import { SavingsIntro } from '@/features/savings/savings-intro';

export default function SavingsScreen() {
  const query = useSavings();
  const { hidden } = usePrivacy();
  const summary = savingsSummary(query.data ?? []);
  const open = (id: number, contribute = false) =>
    router.push({
      pathname: '/(app)/saving-detail',
      params: { id: String(id), ...(contribute ? { contribute: '1' } : {}) },
    });
  return (
    <Screen
      scroll
      entry
      style={styles.screen}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ScreenHeader
        title="Metas de ahorro"
        subtitle="Sigue lo que llevas para cada objetivo."
        back
        onBack={() => router.back()}
        rightAction={
          query.data?.length ? (
            <TourTarget id="add-saving">
              <IconButton
                name="add"
                accessibilityLabel="Nueva meta"
                onPress={() => openForm('/(app)/saving-form')}
                tone="primary"
              />
            </TourTarget>
          ) : undefined
        }
      />
      {query.isPending ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : !query.data ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <>
          <SavingsIntro />
          {query.isError ? (
            <ErrorState
              title="No pudimos actualizar tus metas"
              message="Sigues viendo la última información disponible."
              onRetry={() => void query.refetch()}
            />
          ) : null}
          {query.data.length ? (
            <>
              <Text style={typography.caption}>
                {summary.active.length} en progreso · {summary.completed.length} cumplidas
              </Text>
              {(
                [
                  ['En progreso', summary.active],
                  ['Cumplidas', summary.completed],
                ] as const
              ).map(([title, goals]) =>
                goals.length ? (
                  <View key={title} style={styles.section}>
                    <SectionHeader title={title} />
                    {goals.map((goal, index) => (
                      <SavingGoalCard
                        key={goal.id ?? index}
                        goal={goal}
                        hidden={hidden}
                        onOpen={() => {
                          if (goal.id !== undefined) open(goal.id);
                        }}
                        onContribute={() => {
                          if (goal.id !== undefined) open(goal.id, true);
                        }}
                      />
                    ))}
                  </View>
                ) : null,
              )}
            </>
          ) : (
            <TourTarget id="add-saving">
              <SavingGoalStarter
                onCreate={(suggestedName) =>
                  openForm('/(app)/saving-form', suggestedName ? { suggestedName } : {})
                }
              />
            </TourTarget>
          )}
        </>
      )}
    </Screen>
  );
}
const styles = themedStyleSheet(() => ({
  screen: { gap: spacing.lg },
  hero: { gap: spacing.lg, padding: spacing.lg },
  heroHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  eyebrow: { ...typography.caption, color: colors.accent, fontWeight: '700', letterSpacing: 0.4 },
  counts: { flexDirection: 'row', gap: spacing.sm },
  count: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: '#FFFFFFB8',
  },
  number: { ...typography.moneyLarge, color: colors.primary },
  section: { gap: spacing.md },
}));
