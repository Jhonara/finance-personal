import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSavings, useSavingProgress } from '@/features/secondary/use-secondary';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { usePrivacy } from '@/privacy/privacy-provider';
import { ScreenHeader } from '@/ui/headers';
import { Button, Screen } from '@/ui/primitives';
import { ErrorState, SkeletonCard } from '@/ui/states';
import { BrandSurface } from '@/ui/brand-surface';
import { Progress } from '@/ui/progress';
import { colors, spacing, typography } from '@/theme';
import { presentSavingGoal } from '@/features/savings/savings-presentation';
import { savingsAmount } from '@/features/savings/savings-money';
import { savingTones } from '@/features/savings/saving-goal-card';
import { SavingContributionForm } from '@/features/savings/saving-contribution-form';
import { SavingCelebration } from '@/features/savings/saving-celebration';
import { contributionCelebration, type SavingsCelebration } from '@/features/savings/savings-celebrations';

export default function SavingDetail() {
  const { id, contribute } = useLocalSearchParams<{ id: string; contribute?: string }>();
  const goalId = Number(id);
  const query = useSavings();
  const progress = useSavingProgress(goalId);
  const user = useCurrentUser();
  const raw = query.data?.find((goal) => goal.id === goalId);
  const latestProgress =
    progress.dataUpdatedAt >= query.dataUpdatedAt
      ? (progress.data ?? raw?.progress)
      : (raw?.progress ?? progress.data);
  const goal = raw ? presentSavingGoal(raw, latestProgress) : undefined;
  const { hidden } = usePrivacy();
  const [open, setOpen] = useState(contribute === '1');
  const [celebration, setCelebration] = useState<SavingsCelebration>();
  const refresh = async () => {
    await Promise.all([query.refetch({ throwOnError: true }), progress.refetch({ throwOnError: true })]);
  };
  return (
    <Screen
      scroll
      refreshing={query.isRefetching || progress.isRefetching}
      onRefresh={() => {
        void refresh().catch(() => undefined);
      }}
    >
      <ScreenHeader title={goal?.name ?? 'Meta de ahorro'} back onBack={() => router.back()} />
      {query.isPending ? (
        <SkeletonCard />
      ) : !goal || !raw ? (
        <ErrorState title="Meta no disponible" onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError || progress.isError ? (
            <ErrorState
              title="No pudimos actualizar el progreso"
              message="Puedes consultar la última información disponible."
              onRetry={() => {
                void refresh().catch(() => undefined);
              }}
            />
          ) : null}
          <BrandSurface style={styles.hero}>
            <Text style={[typography.display, { color: savingTones[goal.tone].color }]}>
              {goal.percentageLabel}
            </Text>
            <Text style={typography.moneyMedium}>{savingsAmount(goal.currentAmount, hidden)}</Text>
            <Text style={typography.bodySecondary}>
              ahorrados de {savingsAmount(goal.targetAmount, hidden)}
            </Text>
            {goal.percentage !== undefined ? (
              <Progress
                value={goal.percentage}
                color={savingTones[goal.tone].color}
                label="Progreso de la meta"
              />
            ) : null}
            <Text style={typography.cardTitle}>{goal.completed ? '¡Lo lograste!' : goal.copy}</Text>
            {goal.completed ? (
              <Text style={typography.bodySecondary}>Completaste tu objetivo de ahorro.</Text>
            ) : null}
          </BrandSurface>
          <View style={styles.fields}>
            <Text style={typography.label}>Te faltan</Text>
            <Text style={typography.moneyMedium}>{savingsAmount(goal.remaining, hidden)}</Text>
            <Text style={typography.label}>Estado</Text>
            <Text style={[typography.body, goal.completed && styles.success]}>{goal.status}</Text>
          </View>
          {!goal.completed ? <Button onPress={() => setOpen(true)}>Aportar a esta meta</Button> : null}
          <SavingContributionForm
            visible={open && !celebration}
            goal={{ ...raw, progress: goal.percentage }}
            completed={goal.completed}
            onClose={() => setOpen(false)}
            onReview={refresh}
            onSaved={async (before, after) => {
              setOpen(false);
              if (user.data?.id !== undefined) {
                const next = await contributionCelebration(user.data.id, before, after).catch(
                  () => undefined,
                );
                if (next) setCelebration(next);
              }
            }}
          />
          <SavingCelebration celebration={celebration} onClose={() => setCelebration(undefined)} />
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  fields: { gap: spacing.sm, paddingVertical: spacing.lg },
  success: { color: colors.success },
});
