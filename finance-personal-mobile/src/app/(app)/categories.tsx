import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { openForm } from '@/features/forms/form-session';
import {
  categoryAppearance,
  categoryColors,
  categorySuggestions,
  savedCategoryAppearance,
} from '@/features/categories/category-appearance';
import { createCategory, type Category } from '@/features/categories/categories-api';
import { categoryKeys, useCategories, useUpdateCategory } from '@/features/categories/use-categories';
import { useFeedback } from '@/feedback/feedback-provider';
import { useTour } from '@/features/onboarding/tour-context';
import { colors, radius, spacing, typography } from '@/theme';
import { ScreenHeader } from '@/ui/headers';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { Button, Screen } from '@/ui/primitives';
import { ErrorState, SkeletonRow } from '@/ui/states';
import { TourTarget } from '@/ui/tour-target';

type CategoryType = 'EXPENSE' | 'INCOME';

export default function Categories() {
  const { width, fontScale } = useWindowDimensions();
  const tileWidth = width / fontScale < 320 ? '100%' : '48%';
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const activeQuery = useCategories(type, true);
  const inactiveQuery = useCategories(type, false);
  const update = useUpdateCategory();
  const cache = useQueryClient();
  const feedback = useFeedback();
  const tour = useTour();
  const active = activeQuery.data ?? [];
  const inactive = inactiveQuery.data ?? [];
  const existing = new Set([...active, ...inactive].map((item) => item.name?.trim().toLocaleLowerCase('es')));
  const suggestions = categorySuggestions[type].filter((name) => !existing.has(name.toLocaleLowerCase('es')));
  const toggle = (name: string) =>
    setSelected((items) => (items.includes(name) ? items.filter((item) => item !== name) : [...items, name]));
  const addSelected = async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    const failed: string[] = [];
    let created = 0;
    for (const name of selected) {
      const look = categoryAppearance(name, type);
      try {
        await createCategory({
          name,
          type,
          iconKey: look.icon,
          colorKey: categoryColors.find((color) => color.soft === look.soft)?.key,
        });
        created++;
      } catch {
        failed.push(name);
      }
    }
    await cache.invalidateQueries({ queryKey: categoryKeys.all });
    setSelected(failed);
    setSaving(false);
    if (created > 0) tour?.completeStep?.('add-category');
    feedback.show(
      failed.length
        ? `${created} guardadas. Revisa las ${failed.length} que faltan.`
        : `${created} categorías listas para usar.`,
      failed.length ? 'error' : 'success',
    );
  };
  const changeActive = (item: Category, enabled: boolean) => {
    if (item.id === undefined) return;
    update.mutate(
      { id: item.id, data: { active: enabled, version: item.version ?? 0 } },
      {
        onSuccess: () =>
          feedback.show(enabled ? 'Categoría reactivada.' : 'Categoría desactivada.', 'success'),
        onError: () => feedback.show('No pudimos actualizar la categoría.', 'error'),
      },
    );
  };
  return (
    <Screen
      entry
      scroll
      style={styles.screen}
      refreshing={activeQuery.isRefetching || inactiveQuery.isRefetching}
      onRefresh={() => {
        void activeQuery.refetch();
        void inactiveQuery.refetch();
      }}
    >
      <ScreenHeader
        title="Categorías"
        subtitle="Elige cómo quieres ver tus movimientos."
        back
        onBack={() => router.back()}
      />
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="shapes-outline" size={29} color={colors.success} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={typography.sectionTitle}>Tu dinero, a tu manera</Text>
          <Text style={typography.bodySecondary}>
            Empieza con ideas o crea las tuyas. Podrás cambiarlas cuando quieras.
          </Text>
        </View>
      </View>
      <View style={styles.tabs}>
        {(['EXPENSE', 'INCOME'] as const).map((value) => (
          <MotionPressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: type === value }}
            onPress={() => {
              setType(value);
              setSelected([]);
            }}
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
      {activeQuery.isPending ? (
        <SkeletonRow />
      ) : activeQuery.isError ? (
        <ErrorState onRetry={() => void activeQuery.refetch()} />
      ) : (
        <MotionEntry revision={type} style={styles.content}>
          {suggestions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.heading}>
                <View style={styles.grow}>
                  <Text accessibilityRole="header" style={typography.sectionTitle}>
                    Elige las que usas
                  </Text>
                  <Text style={typography.bodySecondary}>
                    Son ideas. Solo se guardan las que selecciones.
                  </Text>
                </View>
                <Text style={styles.counter}>{selected.length} elegidas</Text>
              </View>
              <View style={styles.grid}>
                {suggestions.map((name) => {
                  const look = categoryAppearance(name, type);
                  const checked = selected.includes(name);
                  return (
                    <MotionPressable
                      key={name}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={name}
                      onPress={() => toggle(name)}
                      style={[
                        styles.tile,
                        {
                          width: tileWidth,
                          backgroundColor: look.soft,
                          borderColor: checked ? look.ink : 'transparent',
                        },
                      ]}
                    >
                      <View style={[styles.tileIcon, { backgroundColor: `${look.ink}19` }]}>
                        <Ionicons name={look.icon} size={28} color={look.ink} />
                      </View>
                      <Text numberOfLines={2} style={[styles.tileName, { color: look.ink }]}>
                        {name}
                      </Text>
                      <View
                        style={[
                          styles.check,
                          checked && { backgroundColor: look.ink, borderColor: look.ink },
                        ]}
                      >
                        <Ionicons
                          name={checked ? 'checkmark' : 'add'}
                          size={15}
                          color={checked ? colors.surface : look.ink}
                        />
                      </View>
                    </MotionPressable>
                  );
                })}
              </View>
              {selected.length > 0 && (
                <Button loading={saving} disabled={saving} onPress={() => void addSelected()}>
                  Agregar {selected.length} {selected.length === 1 ? 'categoría' : 'categorías'}
                </Button>
              )}
            </View>
          )}
          <TourTarget id="add-category">
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Crear categoría personalizada"
              onPress={() => openForm('/(app)/category-form', { type })}
              style={styles.create}
            >
              <View style={styles.createIcon}>
                <Ionicons name="add" size={25} color={colors.primary} />
              </View>
              <View style={styles.grow}>
                <Text style={typography.cardTitle}>Crear una a tu estilo</Text>
                <Text style={typography.caption}>Nombre, ícono y color propios</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </MotionPressable>
          </TourTarget>
          <View style={styles.section}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                Tus categorías
              </Text>
              <Text style={typography.caption}>{active.length} activas</Text>
            </View>
            {active.length ? (
              <View style={styles.grid}>
                {active.map((item) => {
                  const look = savedCategoryAppearance(item);
                  return (
                    <MotionPressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${item.name}`}
                      onPress={() => openForm('/(app)/category-form', { id: String(item.id), type })}
                      style={[styles.savedTile, { width: tileWidth, borderColor: look.soft }]}
                    >
                      <View style={[styles.tileIcon, { backgroundColor: look.soft }]}>
                        <Ionicons name={look.icon} size={27} color={look.ink} />
                      </View>
                      <Text numberOfLines={2} style={styles.tileName}>
                        {item.name}
                      </Text>
                      <View style={styles.savedBottom}>
                        <Text style={typography.caption}>Editar</Text>
                        <MotionPressable
                          accessibilityRole="button"
                          accessibilityLabel={`Desactivar ${item.name}`}
                          disabled={update.isPending}
                          onPress={(event) => {
                            event.stopPropagation();
                            changeActive(item, false);
                          }}
                          style={styles.miniButton}
                        >
                          <Ionicons name="pause-outline" size={17} color={colors.textSecondary} />
                        </MotionPressable>
                      </View>
                    </MotionPressable>
                  );
                })}
              </View>
            ) : (
              <Text style={typography.bodySecondary}>
                Todavía no tienes categorías de {type === 'EXPENSE' ? 'gasto' : 'ingreso'}. Elige una idea o
                crea la tuya.
              </Text>
            )}
          </View>
          {inactiveQuery.data?.length ? (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                Pausadas
              </Text>
              <Text style={typography.caption}>Su historial sigue intacto.</Text>
              {inactive.map((item) => {
                const look = savedCategoryAppearance(item);
                return (
                  <View key={item.id} style={styles.inactiveRow}>
                    <Ionicons name={look.icon} size={24} color={look.ink} />
                    <Text style={[typography.cardTitle, styles.grow]}>{item.name}</Text>
                    <MotionPressable
                      accessibilityRole="button"
                      accessibilityLabel={`Reactivar ${item.name}`}
                      disabled={update.isPending}
                      onPress={() => changeActive(item, true)}
                      style={styles.reactivate}
                    >
                      <Text style={styles.reactivateText}>Activar</Text>
                    </MotionPressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </MotionEntry>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  content: { gap: spacing.xl },
  grow: { flex: 1, minWidth: 0 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.primaryStrong },
  tabText: { ...typography.label, color: colors.primaryStrong },
  tabTextActive: { color: colors.surface },
  section: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  counter: { ...typography.caption, color: colors.success, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    minHeight: 132,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  tileIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileName: { ...typography.cardTitle, fontSize: 14, lineHeight: 19, flexShrink: 1 },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  create: {
    minHeight: 74,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  savedTile: {
    minHeight: 145,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  savedBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  miniButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  reactivate: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    justifyContent: 'center',
  },
  reactivateText: { ...typography.label, color: colors.success },
});
