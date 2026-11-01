import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { Category } from '@/features/categories/categories-api';
import { savedCategoryAppearance } from '@/features/categories/category-appearance';
import {
  categoryChildren,
  categoryHierarchySelection,
  categoryParents,
} from '@/features/categories/category-hierarchy';
import { colors, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { useAppTheme } from '@/theme/theme-provider';
import { ModalSelector } from './modal-selector';
import { MotionPressable } from './motion';
import { SelectField } from './primitives';
import { QuickCategoryModal } from './quick-category-modal';

export type CategoryHierarchyFieldProps = {
  categories: Category[];
  value?: number;
  onChange(id: number | undefined): void;
  type: 'EXPENSE' | 'INCOME';
  loading?: boolean;
  error?: string;
  optional?: boolean;
  allowCreate?: boolean;
  allowRootSelection?: boolean;
  rootSelectionLabel?: string;
  onSelectorOpenChange?(open: boolean): void;
  onCreateParent?(): void;
  onCreateSubcategory?(parentCategoryId: number): void;
};

/** One category ID remains the financial reference; the two fields only organize its selection. */
export function CategoryHierarchyField({
  categories,
  value,
  onChange,
  type,
  loading,
  error,
  optional = false,
  allowCreate = true,
  allowRootSelection = true,
  rootSelectionLabel,
  onSelectorOpenChange,
  onCreateParent,
  onCreateSubcategory,
}: CategoryHierarchyFieldProps) {
  const { palette: colors } = useAppTheme();
  const selection = categoryHierarchySelection(categories, value);
  const [pendingParent, setPendingParent] = useState<number>();
  const [picker, setPicker] = useState<'parent' | 'child' | null>(null);
  const [creating, setCreating] = useState<'parent' | 'child' | null>(null);
  const parentId = selection.parentId ?? pendingParent;
  const parent = selection.parent ?? categories.find((item) => item.id === parentId);
  const parents = categoryParents(categories, type);
  const children = categoryChildren(categories, parentId, type);
  const look = savedCategoryAppearance(parent ?? { type });
  useEffect(() => {
    onSelectorOpenChange?.(picker !== null || creating !== null);
  }, [picker, creating, onSelectorOpenChange]);
  const createParent = () => {
    setPicker(null);
    if (onCreateParent) onCreateParent();
    else setCreating('parent');
  };
  const createChild = () => {
    if (parentId == null) return;
    setPicker(null);
    if (onCreateSubcategory) onCreateSubcategory(parentId);
    else setCreating('child');
  };
  return (
    <View style={styles.field}>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: look.soft }]}>
          <Ionicons name={look.icon} size={21} color={look.ink} />
        </View>
        <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
          Categoría y subcategoría{optional ? ' · opcional' : ''}
        </Text>
      </View>
      <SelectField
        label="Categoría padre"
        value={parent?.name ?? selection.category?.parentCategoryName ?? undefined}
        placeholder="Selecciona una categoría padre"
        onPress={() => setPicker('parent')}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {parentId != null ? (
        <View style={styles.childField}>
          <SelectField
            label="Subcategoría"
            value={
              selection.isSubcategory
                ? selection.category?.name
                : allowRootSelection
                  ? (rootSelectionLabel ?? 'Sin subcategoría')
                  : undefined
            }
            placeholder="Selecciona una subcategoría"
            onPress={() => setPicker('child')}
          />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {selection.isSubcategory
              ? `${parent?.name ?? selection.category?.parentCategoryName ?? 'Categoría padre'} › ${selection.category?.name}`
              : children.length
                ? 'Elige el detalle que mejor describa este movimiento.'
                : 'Puedes crear una subcategoría para organizar el detalle.'}
          </Text>
          {allowCreate ? (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel={`Crear subcategoría en ${parent?.name ?? 'la categoría padre'}`}
              onPress={createChild}
              style={styles.action}
            >
              <Ionicons name="add-circle-outline" size={19} color={colors.primary} />
              <Text style={styles.actionText}>Crear subcategoría</Text>
            </MotionPressable>
          ) : null}
        </View>
      ) : null}
      {allowCreate ? (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Crear categoría padre"
          onPress={createParent}
          style={styles.action}
        >
          <Ionicons name="folder-open-outline" size={19} color={colors.primary} />
          <Text style={styles.actionText}>Crear categoría padre</Text>
        </MotionPressable>
      ) : null}
      <ModalSelector
        visible={picker === 'parent'}
        label="Categoría padre"
        subtitle={
          type === 'INCOME'
            ? 'Elige el grupo al que pertenece este ingreso.'
            : 'Elige el grupo al que pertenece este gasto.'
        }
        loading={loading}
        selectedId={parentId}
        options={[
          ...(optional ? [{ id: 0, label: 'Sin categoría', icon: 'remove-circle-outline' as const }] : []),
          ...parents.map((item) => {
            const childCount = categoryChildren(categories, item.id, type).length;
            return {
              id: item.id!,
              label: item.name ?? 'Categoría padre',
              subtitle: `${childCount} ${childCount === 1 ? 'subcategoría' : 'subcategorías'}`,
              icon: savedCategoryAppearance(item).icon,
            };
          }),
        ]}
        onClose={() => setPicker(null)}
        onSelect={(id) => {
          setPendingParent(id || undefined);
          onChange(id ? (allowRootSelection ? id : undefined) : undefined);
        }}
        emptyTitle="Crea tu primera categoría padre"
        emptyDescription="Después podrás agregar sus subcategorías."
        emptyActionLabel={allowCreate ? 'Crear categoría padre' : undefined}
        onEmptyAction={allowCreate ? createParent : undefined}
      />
      <ModalSelector
        visible={picker === 'child'}
        label="Subcategoría"
        subtitle={`Dentro de ${parent?.name ?? 'la categoría padre seleccionada'}`}
        selectedId={value}
        options={[
          ...(allowRootSelection && parentId != null
            ? [
                {
                  id: parentId,
                  label: rootSelectionLabel ?? 'Sin subcategoría',
                  subtitle: `Registrar directamente en ${parent?.name ?? 'esta categoría padre'}`,
                  icon: 'folder-outline' as const,
                },
              ]
            : []),
          ...children.map((item) => ({
            id: item.id!,
            label: item.name ?? 'Subcategoría',
            subtitle: `Subcategoría de ${parent?.name ?? item.parentCategoryName ?? ''}`,
            icon: savedCategoryAppearance(item).icon,
          })),
        ]}
        onClose={() => setPicker(null)}
        onSelect={onChange}
        emptyTitle="Este grupo aún no tiene subcategorías"
        emptyDescription="Crea una para registrar el detalle de tus movimientos."
        emptyActionLabel={allowCreate ? 'Crear subcategoría' : undefined}
        onEmptyAction={allowCreate ? createChild : undefined}
      />
      <QuickCategoryModal
        visible={creating !== null}
        type={type}
        rootOnly={creating === 'parent'}
        lockedParentCategoryId={creating === 'child' ? parentId : undefined}
        onClose={() => setCreating(null)}
        onCreated={(id) => {
          if (creating === 'parent') setPendingParent(id);
          onChange(creating === 'parent' && !allowRootSelection ? undefined : id);
          setCreating(null);
        }}
      />
    </View>
  );
}

const styles = themedStyleSheet(() => ({
  field: { gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  icon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  childField: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    gap: spacing.sm,
  },
  action: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionText: { ...typography.label, color: colors.primary },
  error: { ...typography.caption, color: colors.danger },
}));
