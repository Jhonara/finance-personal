import { openForm } from '@/features/forms/form-session';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { TourTarget } from '@/ui/tour-target';
import { categoryAppearance, categorySuggestions } from '@/features/categories/category-appearance';

import { useCategories, useUpdateCategory } from '@/features/categories/use-categories';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { ScreenHeader } from '@/ui/headers';
import { MotionPressable } from '@/ui/motion';
import { Button, Screen } from '@/ui/primitives';
import { ErrorState, SkeletonRow } from '@/ui/states';

export default function Categories() {
  const { width, fontScale } = useWindowDimensions();
  const columns = width / fontScale >= 320 ? 2 : 1;
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
      <TourTarget id="add-category">
        <Button onPress={create}>+ Crear categoría</Button>
      </TourTarget>
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
                <View
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    { width: columns === 2 && active.length > 1 ? '48%' : '100%' },
                  ]}
                >
                  <View
                    style={[styles.icon, { backgroundColor: categoryAppearance(category.name, type).soft }]}
                  >
                    <Ionicons
                      name={categoryAppearance(category.name, type).icon}
                      size={29}
                      color={categoryAppearance(category.name, type).ink}
                    />
                  </View>
                  <View style={styles.copy}>
                    <Text style={typography.cardTitle}>{category.name}</Text>
                    <Text style={typography.caption}>Disponible al registrar</Text>
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
                    <Text style={typography.caption}>Desactivar</Text>
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
      <View style={styles.suggestions}>
        <Text style={typography.sectionTitle}>Ideas para organizarte</Text>
        <Text style={typography.caption}>Elige una idea y revisa el nombre antes de crearla.</Text>
        <View style={styles.list}>
          {categorySuggestions[type].map((name) => {
            const look = categoryAppearance(name, type);
            return (
              <MotionPressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`Crear categoría ${name}`}
                onPress={() => openForm('/(app)/category-form', { type, suggestedName: name })}
                style={[styles.suggestion, { backgroundColor: look.soft }]}
              >
                <Ionicons name={look.icon} size={23} color={look.ink} />
                <Text style={[typography.caption, { color: look.ink, flexShrink: 1 }]}>{name}</Text>
                <Ionicons name="add-circle-outline" size={18} color={look.ink} />
              </MotionPressable>
            );
          })}
        </View>
        <Text style={typography.caption}>
          Desactivar una categoría conserva su historial. Puedes reactivarla cuando la necesites.
        </Text>
      </View>
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
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryCard: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestions: { gap: spacing.md, padding: spacing.lg, borderRadius: 24, backgroundColor: colors.surface },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    padding: spacing.sm,
    borderRadius: 16,
  },
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
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  copy: { flex: 1, gap: spacing.xxs },
  statusButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
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
