import { openForm } from '@/features/forms/form-session';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSavings } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { IconButton, Screen } from '@/ui/primitives';
import { BrandSurface } from '@/ui/brand-surface';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { colors, spacing, typography } from '@/theme';
import { SavingGoalCard } from '@/features/savings/saving-goal-card';
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
      style={{ gap: spacing.md }}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <ScreenHeader
        title="Ahorros"
        subtitle="Convierte tus planes en metas."
        back
        onBack={() => router.back()}
        rightAction={
          query.data?.length ? (
            <IconButton
              name="add"
              accessibilityLabel="Nueva meta"
              onPress={() => openForm('/(app)/saving-form')}
              tone="primary"
            />
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
              <BrandSurface style={styles.hero}>
                <Text style={typography.sectionTitle}>Tus metas</Text>
                <View style={styles.counts}>
                  <View style={styles.count}>
                    <Text style={styles.number}>{summary.active.length}</Text>
                    <Text style={typography.bodySecondary}>En progreso</Text>
                  </View>
                  <View style={styles.count}>
                    <Text style={[styles.number, { color: colors.success }]}>{summary.completed.length}</Text>
                    <Text style={typography.bodySecondary}>Cumplidas</Text>
                  </View>
                </View>
                <Text style={typography.bodySecondary}>Cada aporte tiene un propósito.</Text>
              </BrandSurface>
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
            <EmptyState
              title="¿Qué quieres lograr?"
              description="Crea una meta y empieza a construirla paso a paso."
              actionLabel="Crear mi primera meta"
              tone="primary"
              onAction={() => openForm('/(app)/saving-form')}
            />
          )}
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxl },
  count: { gap: spacing.xs },
  number: { ...typography.moneyLarge, color: colors.primary },
  section: { gap: spacing.md },
});
