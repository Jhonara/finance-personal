import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  categoryAppearance,
  categoryColors,
  categoryIcons,
  categorySuggestions,
} from '@/features/categories/category-appearance';
import { getCategory } from '@/features/categories/categories-api';
import { useCreateCategory, useUpdateCategory } from '@/features/categories/use-categories';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useFeedback } from '@/feedback/feedback-provider';
import { useTour } from '@/features/onboarding/tour-context';
import { colors, radius, spacing, typography } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { MovementFormHeader } from '@/ui/movement-form';
import { Button, Input, Screen } from '@/ui/primitives';

type IconKey = (typeof categoryIcons)[number]['key'];
type ColorKey = (typeof categoryColors)[number]['key'];

function CategoryForm() {
  const activeSession = useFormSessionActive();
  const params = useLocalSearchParams<{ id?: string; type?: string; suggestedName?: string }>();
  const id = Number(params.id);
  const editing = Number.isInteger(id) && id > 0;
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(params.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
  const [name, setName] = useState(params.suggestedName ?? '');
  const [icon, setIcon] = useState<IconKey | undefined>();
  const [color, setColor] = useState<ColorKey | undefined>();
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const existing = useQuery({ queryKey: ['category', id], queryFn: () => getCategory(id), enabled: editing });
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const feedback = useFeedback();
  const tour = useTour();
  useEffect(() => {
    if (!existing.data) return;
    setName(existing.data.name ?? '');
    setIcon(categoryIcons.find((item) => item.key === existing.data?.iconKey)?.key);
    setColor(categoryColors.find((item) => item.key === existing.data?.colorKey)?.key);
  }, [existing.data]);
  const fallback = categoryAppearance(name, type);
  const visualIcon = icon ?? fallback.icon;
  const visualColor =
    categoryColors.find((item) => item.key === color) ??
    categoryColors.find((item) => item.soft === fallback.soft) ??
    categoryColors[0];
  const busy = create.isPending || update.isPending;
  const submit = () => {
    if (busy) return;
    if (!name.trim()) {
      setError('Escribe un nombre para la categoría.');
      return;
    }
    const onSuccess = () => {
      if (!activeSession()) return;
      if (!editing) tour?.completeStep?.('add-category');
      feedback.show(
        editing
          ? 'Categoría actualizada.'
          : params.type && params.type !== type
            ? `Categoría creada en ${type === 'INCOME' ? 'Ingresos' : 'Gastos'}.`
            : 'Categoría creada.',
        'success',
      );
      router.back();
    };
    const onError = () =>
      feedback.show(editing ? 'No pudimos guardar los cambios.' : 'No pudimos crear la categoría.', 'error');
    if (editing)
      update.mutate(
        {
          id,
          data: {
            name: name.trim(),
            iconKey: visualIcon,
            colorKey: visualColor.key,
            version: existing.data?.version ?? 0,
          },
        },
        { onSuccess, onError },
      );
    else
      create.mutate(
        { name: name.trim(), type, iconKey: visualIcon, colorKey: visualColor.key },
        { onSuccess, onError },
      );
  };
  return (
    <Screen entry scroll keyboard style={styles.screen}>
      <MovementFormHeader
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        onBack={() => router.back()}
      />
      <View style={styles.previewWrap}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Elegir ícono y color"
          onPress={() => setPicker(true)}
          style={[styles.preview, { backgroundColor: visualColor.soft }]}
        >
          <Ionicons name={visualIcon} size={46} color={visualColor.ink} />
          <View style={styles.previewEdit}>
            <Ionicons name="pencil" size={15} color={colors.surface} />
          </View>
        </MotionPressable>
        <Text style={typography.bodySecondary}>Toca para cambiar ícono y color</Text>
      </View>
      {!editing && (
        <View style={styles.tabs}>
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'EXPENSE' }}
            onPress={() => {
              setType('EXPENSE');
              setName('');
              setIcon(undefined);
              setColor(undefined);
            }}
            style={[styles.tab, type === 'EXPENSE' && styles.tabActive]}
          >
            <Text style={[typography.label, type === 'EXPENSE' && styles.activeText]}>Gasto</Text>
          </MotionPressable>
          <MotionPressable
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'INCOME' }}
            onPress={() => {
              setType('INCOME');
              setName('');
              setIcon(undefined);
              setColor(undefined);
            }}
            style={[styles.tab, type === 'INCOME' && styles.tabActive]}
          >
            <Text style={[typography.label, type === 'INCOME' && styles.activeText]}>Ingreso</Text>
          </MotionPressable>
        </View>
      )}
      {!editing && (
        <View style={styles.section}>
          <Text style={typography.cardTitle}>Puedes empezar por una idea</Text>
          <View style={styles.ideas}>
            {categorySuggestions[type].map((idea) => {
              const look = categoryAppearance(idea, type);
              return (
                <MotionPressable
                  key={idea}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar ${idea}`}
                  onPress={() => {
                    setName(idea);
                    setIcon(look.icon);
                    setColor(categoryColors.find((item) => item.soft === look.soft)?.key);
                    setError('');
                  }}
                  style={[styles.idea, name === idea && { borderColor: look.ink }]}
                >
                  <Ionicons name={look.icon} size={20} color={look.ink} />
                  <Text style={typography.caption}>{idea}</Text>
                </MotionPressable>
              );
            })}
          </View>
        </View>
      )}
      <View style={styles.section}>
        <Input
          label="Nombre de la categoría"
          value={name}
          onChangeText={(value) => {
            setName(value);
            setError('');
          }}
          placeholder={type === 'INCOME' ? 'Ej. Nómina' : 'Ej. Alimentación'}
          error={error}
        />
        <Text style={typography.caption}>
          Aparecerá al registrar tus {type === 'INCOME' ? 'ingresos' : 'gastos'}.
        </Text>
      </View>
      <Button loading={busy} disabled={busy || (editing && existing.isPending)} onPress={submit}>
        {editing ? 'Guardar cambios' : 'Crear categoría'}
      </Button>
      <Modal visible={picker} animationType="slide" transparent onRequestClose={() => setPicker(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <View style={styles.sheetTop}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                Dale tu estilo
              </Text>
              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector"
                onPress={() => setPicker(false)}
              >
                <Ionicons name="close" size={25} color={colors.primary} />
              </MotionPressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <Text style={typography.label}>Ícono</Text>
              <View style={styles.iconGrid}>
                {categoryIcons.map((item) => (
                  <MotionPressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: visualIcon === item.key }}
                    onPress={() => setIcon(item.key)}
                    style={[styles.iconChoice, visualIcon === item.key && styles.selectedChoice]}
                  >
                    <Ionicons
                      name={item.key}
                      size={26}
                      color={visualIcon === item.key ? colors.surface : colors.primary}
                    />
                  </MotionPressable>
                ))}
              </View>
              <Text style={typography.label}>Color</Text>
              <View style={styles.colorGrid}>
                {categoryColors.map((item) => (
                  <MotionPressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: visualColor.key === item.key }}
                    onPress={() => setColor(item.key)}
                    style={[
                      styles.colorChoice,
                      {
                        backgroundColor: item.soft,
                        borderColor: visualColor.key === item.key ? item.ink : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={visualColor.key === item.key ? 'checkmark' : 'ellipse'}
                      size={22}
                      color={item.ink}
                    />
                  </MotionPressable>
                ))}
              </View>
              <Button onPress={() => setPicker(false)}>Aplicar estilo</Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  previewWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  preview: { width: 104, height: 104, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  previewEdit: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryStrong,
  },
  tabs: {
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  tab: {
    minWidth: 100,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.primaryStrong },
  activeText: { color: colors.surface },
  section: { gap: spacing.md, padding: spacing.lg, borderRadius: 22, backgroundColor: colors.surface },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  idea: {
    minHeight: 43,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetContent: { gap: spacing.lg, paddingBottom: spacing.xxl },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  selectedChoice: { backgroundColor: colors.primaryStrong },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorChoice: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

export default withFormSession(CategoryForm);
