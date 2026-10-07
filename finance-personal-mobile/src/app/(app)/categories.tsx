import { openForm } from '@/features/forms/form-session';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCategories, useUpdateCategory } from '@/features/categories/use-categories';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { ScreenHeader } from '@/ui/headers';
import { MotionPressable } from '@/ui/motion';
import { Button, Screen } from '@/ui/primitives';
import { ErrorState, SkeletonRow } from '@/ui/states';

export default function Categories() {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const q = useCategories(type, null);
  const m = useUpdateCategory();
  const feedback = useFeedback();
  const active = q.data?.filter((item) => item.active !== false) ?? [];
  const inactive = q.data?.filter((item) => item.active === false) ?? [];
  const create = () => openForm('/(app)/category-form', { type });
  return (
    <Screen entry scroll style={styles.screen} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <ScreenHeader
        title="Categorías"
        subtitle="Dale sentido a cada movimiento."
        back
        onBack={() => router.back()}
      />
      <View style={styles.intro}>
        <View style={styles.introIcon}>
          <Ionicons name="pricetags-outline" size={27} color={colors.success} />
        </View>
        <View style={styles.introCopy}>
          <Text style={typography.cardTitle}>Tu dinero, más claro</Text>
          <Text style={typography.bodySecondary}>
            Organiza ingresos y gastos para entender mejor tus hábitos.
          </Text>
        </View>
      </View>
      <View style={styles.tabs}>
        {(['EXPENSE', 'INCOME'] as const).map((value) => (
          <MotionPressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: type === value }}
            onPress={() => setType(value)}
            style={[styles.tab, type === value && styles.tabActive]}
          >
            <Ionicons
              name={value === 'EXPENSE' ? 'bag-handle-outline' : 'trending-up-outline'}
              size={18}
              color={type === value ? colors.surface : colors.primary}
            />
            <Text style={[styles.tabText, type === value && styles.tabTextActive]}>
              {value === 'EXPENSE' ? 'Gastos' : 'Ingresos'}
            </Text>
          </MotionPressable>
        ))}
      </View>
      <Button onPress={create}>+ Crear categoría</Button>
      {q.isPending ? (
        <SkeletonRow />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : (
        <>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={typography.sectionTitle}>
              {type === 'EXPENSE' ? 'Categorías de gasto' : 'Categorías de ingreso'}
            </Text>
            <Text style={typography.caption}>
              {active.length === 1 ? '1 activa' : `${active.length} activas`}
            </Text>
          </View>
          {active.length ? (
            <View style={styles.list}>
              {active.map((category) => (
                <View key={category.id} style={styles.row}>
                  <View
                    style={[
                      styles.icon,
                      { backgroundColor: type === 'EXPENSE' ? colors.coralSoft : colors.successSoft },
                    ]}
                  >
                    <Ionicons
                      name={type === 'EXPENSE' ? 'pricetag-outline' : 'sparkles-outline'}
                      size={21}
                      color={type === 'EXPENSE' ? colors.danger : colors.success}
                    />
                  </View>
                  <View style={styles.copy}>
                    <Text style={typography.cardTitle}>{category.name}</Text>
                    <Text style={typography.caption}>Activa para nuevos movimientos</Text>
                  </View>
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel={`Desactivar ${category.name}`}
                    disabled={m.isPending || category.id === undefined}
                    onPress={() =>
                      m.mutate(
                        { id: category.id!, data: { active: false, version: category.version ?? 0 } },
                        {
                          onSuccess: () => feedback.show('Categoría desactivada.', 'success'),
                          onError: () => feedback.show('No pudimos actualizar la categoría.', 'error'),
                        },
                      )
                    }
                    style={styles.statusButton}
                  >
                    <Ionicons name="pause-outline" size={18} color={colors.textSecondary} />
                  </MotionPressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>
              Aún no hay categorías activas de {type === 'EXPENSE' ? 'gasto' : 'ingreso'}.
            </Text>
          )}
          {inactive.length ? (
            <View style={styles.inactive}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                Inactivas
              </Text>
              {inactive.map((category) => (
                <View key={category.id} style={styles.row}>
                  <View style={styles.icon}>
                    <Ionicons name="pricetag-outline" size={20} color={colors.textMuted} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={typography.cardTitle}>{category.name}</Text>
                    <Text style={typography.caption}>No aparece al registrar</Text>
                  </View>
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel={`Reactivar ${category.name}`}
                    disabled={m.isPending || category.id === undefined}
                    onPress={() =>
                      m.mutate(
                        { id: category.id!, data: { active: true, version: category.version ?? 0 } },
                        {
                          onSuccess: () => feedback.show('Categoría reactivada.', 'success'),
                          onError: () => feedback.show('No pudimos actualizar la categoría.', 'error'),
                        },
                      )
                    }
                    style={styles.reactivate}
                  >
                    <Text style={styles.reactivateText}>Activar</Text>
                  </MotionPressable>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.primarySoft,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  introCopy: { flex: 1, gap: spacing.xs },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  tabText: { ...typography.label, color: colors.primaryStrong },
  tabTextActive: { color: colors.surface },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  icon: {
    width: 43,
    height: 43,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  copy: { flex: 1, gap: spacing.xxs },
  statusButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  reactivate: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
  },
  reactivateText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  empty: {
    ...typography.bodySecondary,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  inactive: { gap: spacing.sm },
});
