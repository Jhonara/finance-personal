import { themedStyleSheet } from '@/theme/themed-styles';
import { useAppTheme } from '@/theme/theme-provider';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateCategory } from '@/features/categories/use-categories';
import { categoryLabel } from '@/features/categories/categories-api';
import { useCategories } from '@/features/categories/use-categories';
import { savedCategoryAppearance } from '@/features/categories/category-appearance';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MotionModal as Modal } from './motion-modal';
import { MotionPressable } from './motion';
import { Button, Input, SelectField } from './primitives';
import { CategoryStylePicker } from './category-style-picker';
import { ModalSelector } from './modal-selector';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

export function QuickCategoryModal({
  visible,
  type,
  onClose,
  onCreated,
  allowParent = false,
  initialParentCategoryId,
  lockedParentCategoryId,
  rootOnly = false,
}: {
  visible: boolean;
  type: 'EXPENSE' | 'INCOME';
  onClose(): void;
  onCreated(id: number): void;
  allowParent?: boolean;
  initialParentCategoryId?: number | null;
  lockedParentCategoryId?: number;
  rootOnly?: boolean;
}) {
  const { palette: colors } = useAppTheme();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [parentPicker, setParentPicker] = useState(false);
  const [stylePicker, setStylePicker] = useState(false);
  const [iconKey, setIconKey] = useState<string>();
  const [colorKey, setColorKey] = useState<string>();
  const submitting = useRef(false);
  const insets = useSafeAreaInsets();
  const mutation = useCreateCategory();
  const categories = useCategories(type);
  const feedback = useFeedback();
  useEffect(() => {
    if (visible) setParentId(rootOnly ? null : (lockedParentCategoryId ?? initialParentCategoryId ?? null));
  }, [visible, rootOnly, lockedParentCategoryId, initialParentCategoryId]);
  const selectedParentId = rootOnly ? null : (lockedParentCategoryId ?? parentId);
  const parent = categories.data?.find((item) => item.id === selectedParentId);
  const child = selectedParentId != null;
  const title = child
    ? 'Nueva subcategoría'
    : rootOnly
      ? 'Nueva categoría padre'
      : type === 'EXPENSE'
        ? 'Nueva categoría de gasto'
        : 'Nueva categoría de ingreso';
  const appearance = savedCategoryAppearance({ name, type, iconKey, colorKey });
  const close = () => {
    if (!mutation.isPending) {
      setName('');
      setNameError('');
      setParentId(null);
      setParentPicker(false);
      setStylePicker(false);
      setIconKey(undefined);
      setColorKey(undefined);
      onClose();
    }
  };
  return (
    <Modal transparent visible={visible} onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons
                name={child ? 'return-down-forward-outline' : 'folder-outline'}
                size={23}
                color={colors.success}
              />
            </View>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                {title}
              </Text>
              <Text style={typography.caption}>
                {child
                  ? `Dentro de ${parent?.name ?? 'la categoría padre seleccionada'}`
                  : 'Agrupa movimientos y subcategorías del mismo tipo.'}
              </Text>
            </View>
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={close}
              style={styles.close}
            >
              <Ionicons name="close" size={20} color={colors.primary} />
            </MotionPressable>
          </View>
          <KeyboardAwareScrollView
            bottomOffset={20}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
          >
            <Input
              label={
                child
                  ? 'Nombre de la subcategoría'
                  : rootOnly
                    ? 'Nombre de la categoría padre'
                    : 'Nombre de la categoría'
              }
              value={name}
              onChangeText={(value) => {
                setName(value);
                setNameError('');
              }}
              placeholder={
                child
                  ? type === 'EXPENSE'
                    ? 'Ej. Almuerzos'
                    : 'Ej. Bonificaciones'
                  : type === 'EXPENSE'
                    ? 'Ej. Alimentación'
                    : 'Ej. Ingresos laborales'
              }
              helperText="Podrás usarla en tus próximos movimientos."
              maxLength={100}
              error={nameError}
            />
            {allowParent && !rootOnly && lockedParentCategoryId == null ? (
              <SelectField
                label="Categoría padre"
                value={
                  parentId == null
                    ? 'Crear una categoría padre'
                    : categoryLabel(categories.data?.find((item) => item.id === parentId))
                }
                onPress={() => setParentPicker(true)}
              />
            ) : null}
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Elegir ícono y color"
              onPress={() => setStylePicker((current) => !current)}
              style={styles.identity}
            >
              <View style={[styles.identityIcon, { backgroundColor: appearance.soft }]}>
                <Ionicons name={appearance.icon} size={25} color={appearance.ink} />
              </View>
              <View style={styles.heading}>
                <Text style={typography.label}>Ícono y color</Text>
                <Text style={typography.caption}>Personaliza cómo aparece en tus listas.</Text>
              </View>
              <Ionicons name={stylePicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
            </MotionPressable>
            {stylePicker ? (
              <CategoryStylePicker
                iconKey={appearance.icon}
                colorKey={appearance.colorKey}
                onIconChange={setIconKey}
                onColorChange={setColorKey}
                disabled={mutation.isPending}
              />
            ) : null}
            <Button
              loading={mutation.isPending}
              disabled={mutation.isPending}
              onPress={() => {
                if (submitting.current) return;
                if (!name.trim()) {
                  setNameError('Escribe un nombre para continuar.');
                  return;
                }
                submitting.current = true;
                mutation.mutate(
                  {
                    name: name.trim(),
                    type,
                    parentCategoryId: selectedParentId ?? undefined,
                    iconKey: appearance.icon,
                    colorKey: appearance.colorKey,
                  },
                  {
                    onSuccess: (category) => {
                      if (category.id !== undefined) onCreated(category.id);
                      feedback.show('Categoría creada.', 'success');
                      setName('');
                      setNameError('');
                      setParentId(null);
                      setStylePicker(false);
                      setIconKey(undefined);
                      setColorKey(undefined);
                      mutation.reset();
                      onClose();
                    },
                    onError: () => feedback.show('No fue posible crear la categoría.', 'error'),
                    onSettled: () => {
                      submitting.current = false;
                    },
                  },
                );
              }}
            >
              {child ? 'Crear subcategoría' : rootOnly ? 'Crear categoría padre' : 'Crear categoría'}
            </Button>
          </KeyboardAwareScrollView>
        </View>
      </KeyboardAvoidingView>
      {allowParent && !rootOnly && lockedParentCategoryId == null ? (
        <ModalSelector
          visible={parentPicker}
          label="Categoría padre"
          subtitle="La categoría nueva aparecerá dentro de este grupo."
          loading={categories.isPending}
          selectedId={parentId ?? undefined}
          options={[
            { id: 0, label: 'Crear una categoría padre', icon: 'folder-outline' },
            ...(categories.data ?? [])
              .filter((item) => item.id !== undefined && item.parentCategoryId == null)
              .map((item) => ({
                id: item.id!,
                label: item.name ?? 'Categoría',
                icon: 'pricetag-outline' as const,
              })),
          ]}
          onClose={() => setParentPicker(false)}
          onSelect={(value) => setParentId(value || null)}
        />
      ) : null}
    </Modal>
  );
}

const styles = themedStyleSheet(() => ({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '92%',
    flexShrink: 1,
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surfaceElevated,
    ...shadows.bottomSheet,
  },
  formScroll: { flexShrink: 1 },
  formContent: { gap: spacing.md },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceSecondary,
  },
  identityIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { flex: 1, gap: spacing.xxs },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  close: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
}));
