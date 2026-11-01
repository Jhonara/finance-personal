import { useAppTheme } from '@/theme/theme-provider';
import { themedStyleSheet } from '@/theme/themed-styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { openForm } from '@/features/forms/form-session';
import {
  categoryAppearance,
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
  useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const tileWidth = width / fontScale < 320 ? '100%' : '48%';
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedRoots, setExpandedRoots] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [showIdeas, setShowIdeas] = useState(false);
  const activeQuery = useCategories(type, true);
  const inactiveQuery = useCategories(type, false);
  const update = useUpdateCategory();
  const cache = useQueryClient();
  const feedback = useFeedback();
  const tour = useTour();
  const active = activeQuery.data ?? [];
  const roots = active.filter((item) => item.parentCategoryId == null);
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
          colorKey: look.colorKey,
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
      failed.length ? 'warning' : 'success',
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
        subtitle="Organiza tus gastos e ingresos en dos niveles."
        back
        onBack={() => router.back()}
      />
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="shapes-outline" size={29} color={colors.success} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={typography.sectionTitle}>Categoría padre → subcategoría</Text>
          <Text style={typography.bodySecondary}>
            El padre reúne el grupo; la subcategoría guarda el detalle. Por ejemplo: Alimentación → Almuerzos.
          </Text>
          <Text style={typography.caption}>
            {activeQuery.isPending
              ? 'Cargando tus categorías…'
              : `${active.length} ${active.length === 1 ? 'categoría activa' : 'categorías activas'} de ${type === 'EXPENSE' ? 'gasto' : 'ingreso'}`}
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
              setShowIdeas(false);
            }}
            style={[styles.tab, type === value && styles.tabActive]}
          >
            <Ionicons
              name={value === 'EXPENSE' ? 'bag-handle-outline' : 'trending-up-outline'}
              size={18}
              color={type === value ? '#FFFFFF' : colors.primary}
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
          {suggestions.length > 0 ? (
            <MotionPressable
              accessibilityRole="button"
              onPress={() => setShowIdeas((current) => !current)}
              style={styles.ideasToggle}
            >
              <Text style={styles.reactivateText}>
                {showIdeas ? 'Ocultar ideas de categorías padre' : 'Ver ideas de categorías padre'}
              </Text>
              <Ionicons name={showIdeas ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            </MotionPressable>
          ) : null}
          {showIdeas && suggestions.length > 0 && (
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
                <Text style={styles.counter}>{selected.length} por agregar</Text>
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
              onPress={() => openForm('/(app)/category-form', { type, role: 'parent' })}
              style={styles.create}
            >
              <View style={styles.createIcon}>
                <Ionicons name="add" size={25} color={colors.primary} />
              </View>
              <View style={styles.grow}>
                <Text style={typography.cardTitle}>Crear categoría padre</Text>
                <Text style={typography.caption}>Un grupo con nombre, ícono y color propios</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} />
            </MotionPressable>
          </TourTarget>
          <View style={styles.section}>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                Tus categorías padre
              </Text>
              <Text style={typography.caption}>
                {roots.length} {roots.length === 1 ? 'grupo' : 'grupos'}
              </Text>
            </View>
            {active.length ? (
              <View style={styles.categoryGroups}>
                {roots.map((item) => {
                  const look = savedCategoryAppearance(item);
                  const children = active.filter((child) => child.parentCategoryId === item.id);
                  const expanded = item.id !== undefined && (expandedRoots[item.id] ?? true);
                  return (
                    <View key={item.id} style={styles.categoryGroup}>
                      <View style={[styles.rootCategory, { borderColor: look.soft }]}>
                        <MotionPressable
                          accessibilityRole="button"
                          accessibilityLabel={`Editar categoría principal ${item.name}`}
                          onPress={() => openForm('/(app)/category-form', { id: String(item.id), type })}
                          style={styles.rootCategoryMain}
                        >
                          <View style={[styles.tileIcon, { backgroundColor: look.soft }]}>
                            <Ionicons name={look.icon} size={25} color={look.ink} />
                          </View>
                          <View style={styles.grow}>
                            <Text numberOfLines={2} style={styles.tileName}>
                              {item.name}
                            </Text>
                            <Text style={typography.caption}>
                              Categoría padre
                              {children.length
                                ? ` · ${children.length} ${children.length === 1 ? 'subcategoría' : 'subcategorías'}`
                                : ''}
                            </Text>
                          </View>
                        </MotionPressable>
                        <MotionPressable
                          accessibilityRole="button"
                          accessibilityLabel={`${expanded ? 'Contraer' : 'Desplegar'} ${item.name}`}
                          accessibilityState={{ expanded }}
                          onPress={() =>
                            item.id !== undefined &&
                            setExpandedRoots((current) => ({ ...current, [item.id!]: !expanded }))
                          }
                          style={styles.miniButton}
                        >
                          <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={19}
                            color={colors.primary}
                          />
                        </MotionPressable>
                        <MotionPressable
                          accessibilityRole="button"
                          accessibilityLabel={`Desactivar ${item.name}`}
                          accessibilityHint={
                            children.length ? 'Primero mueve o desactiva sus subcategorías.' : undefined
                          }
                          disabled={update.isPending || children.length > 0}
                          onPress={() => changeActive(item, false)}
                          style={[styles.miniButton, children.length > 0 && styles.disabledButton]}
                        >
                          <Ionicons name="pause-outline" size={17} color={colors.textSecondary} />
                        </MotionPressable>
                      </View>
                      {expanded && children.length ? (
                        <View style={styles.children}>
                          {children.map((child) => {
                            const childLook = savedCategoryAppearance(child);
                            return (
                              <View key={child.id} style={styles.childCategory}>
                                <MotionPressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`Editar subcategoría ${child.name} de ${item.name}`}
                                  onPress={() =>
                                    openForm('/(app)/category-form', { id: String(child.id), type })
                                  }
                                  style={styles.childMain}
                                >
                                  <View style={[styles.childIcon, { backgroundColor: childLook.soft }]}>
                                    <Ionicons name={childLook.icon} size={18} color={childLook.ink} />
                                  </View>
                                  <View style={styles.grow}>
                                    <Text style={styles.childName}>{child.name}</Text>
                                    <Text style={typography.caption}>Subcategoría de {item.name}</Text>
                                  </View>
                                </MotionPressable>
                                <MotionPressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`Desactivar ${child.name}`}
                                  disabled={update.isPending}
                                  onPress={() => changeActive(child, false)}
                                  style={styles.miniButton}
                                >
                                  <Ionicons name="pause-outline" size={17} color={colors.textSecondary} />
                                </MotionPressable>
                              </View>
                            );
                          })}
                        </View>
                      ) : expanded ? (
                        <Text style={styles.emptyChildren}>
                          Aún no tiene subcategorías. Agrega el detalle de este grupo.
                        </Text>
                      ) : null}
                      {expanded ? (
                        <MotionPressable
                          accessibilityRole="button"
                          accessibilityLabel={`Agregar subcategoría a ${item.name}`}
                          onPress={() =>
                            openForm('/(app)/category-form', {
                              type,
                              role: 'child',
                              parentCategoryId: String(item.id),
                            })
                          }
                          style={styles.addChild}
                        >
                          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                          <Text style={styles.reactivateText}>Agregar subcategoría</Text>
                        </MotionPressable>
                      ) : null}
                    </View>
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
                    <View style={styles.grow}>
                      <Text style={typography.cardTitle}>{item.name}</Text>
                      <Text style={typography.caption}>
                        {item.parentCategoryName
                          ? `Subcategoría de ${item.parentCategoryName}`
                          : 'Categoría padre'}
                      </Text>
                    </View>
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

const styles = themedStyleSheet(() => ({
  screen: { gap: spacing.lg },
  content: { gap: spacing.xl },
  grow: { flex: 1, minWidth: 0 },
  ideasToggle: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  addChild: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginLeft: spacing.lg,
  },
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
  tabText: { ...typography.label, color: colors.textPrimary },
  tabTextActive: { color: '#FFFFFF' },
  section: { gap: spacing.md },
  categoryGroups: { gap: spacing.md },
  categoryGroup: { gap: spacing.xs },
  rootCategory: {
    minHeight: 86,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rootCategoryMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 },
  children: {
    marginLeft: spacing.xl,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    gap: spacing.xs,
  },
  childCategory: {
    minHeight: 64,
    paddingLeft: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  childMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  childIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  childName: { ...typography.label, color: colors.textPrimary },
  emptyChildren: { ...typography.caption, paddingLeft: spacing.sm, color: colors.textSecondary },
  disabledButton: { opacity: 0.45 },
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
}));
