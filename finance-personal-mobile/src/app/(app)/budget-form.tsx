import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useUnsavedForm } from '@/features/forms/use-unsaved-form';
import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCategories } from '@/features/categories/use-categories';
import { useBudgets, useCreateBudget, useUpdateBudget } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { useTour } from '@/features/onboarding/tour-context';
import {
  currentDashboardPeriod,
  dashboardPeriodFromParams,
  formatDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { ModalSelector } from '@/ui/modal-selector';
import { QuickCategoryModal } from '@/ui/quick-category-modal';
import { MotionPressable } from '@/ui/motion';
import { Button, Card, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { savedCategoryAppearance } from '@/features/categories/category-appearance';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
function BudgetForm() {
  const {
    id,
    version,
    limit,
    categoryId,
    categoryName,
    parentCategoryId,
    parentCategoryName,
    year,
    month,
    source,
  } = useLocalSearchParams<{
    id?: string;
    version?: string;
    limit?: string;
    categoryId?: string;
    categoryName?: string;
    parentCategoryId?: string;
    parentCategoryName?: string;
    year?: string;
    month?: string;
    source?: string;
  }>();
  const [amount, setAmount] = useState(id ? (limit ?? '') : '');
  const [category, setCategory] = useState<number>(id ? Number(categoryId) : 0);
  const active = useFormSessionActive();
  const submitting = useRef(false);
  const [open, setOpen] = useState<'parent' | 'child' | null>(null);
  const [quickCategory, setQuickCategory] = useState<'parent' | 'child' | null>(null);
  const [parent, setParent] = useState(Number(parentCategoryId) || 0);
  const [scope, setScope] = useState<'subcategory' | 'group'>(
    id && !parentCategoryId ? 'group' : 'subcategory',
  );
  const [categoryError, setCategoryError] = useState('');
  const [amountError, setAmountError] = useState('');
  const categories = useCategories('EXPENSE');
  const mutation = useCreateBudget();
  const update = useUpdateBudget();
  const feedback = useFeedback();
  const tour = useTour();
  const [period] = useState(() => dashboardPeriodFromParams(year, month) ?? currentDashboardPeriod());
  const budgets = useBudgets(period.year, period.month, true);
  const selectedCategory = categories.data?.find((item) => item.id === category);
  const selectedParentId = parent || (id ? (selectedCategory?.parentCategoryId ?? category) : 0);
  const selectedParent = categories.data?.find((item) => item.id === selectedParentId);
  const selectedScope = id
    ? selectedCategory?.parentCategoryId || Number(parentCategoryId)
      ? 'subcategory'
      : 'group'
    : scope;
  const children = (categories.data ?? []).filter((item) => item.parentCategoryId === selectedParentId);
  const existingBudget = !id ? budgets.data?.find((item) => item.categoryId === category) : undefined;
  const { width, fontScale } = useWindowDimensions();
  const compact = width <= 360 || fontScale >= 1.2;
  const leave = () => {
    if (source === 'budget-detail' && id)
      router.replace({
        pathname: '/(app)/budget-detail',
        params: { id, year: String(period.year), month: String(period.month) },
      });
    else if (source === 'budgets')
      router.replace({
        pathname: '/(app)/budgets',
        params: { year: String(period.year), month: String(period.month) },
      });
    else router.back();
  };
  const guard = useUnsavedForm({
    dirty:
      amount !== (id ? (limit ?? '') : '') ||
      category !== (id ? Number(categoryId) : 0) ||
      (!id && parent !== (Number(parentCategoryId) || 0)),
    busy: mutation.isPending || update.isPending,
    suspended: Boolean(open || quickCategory),
    onBack: leave,
  });
  return (
    <Screen scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title={id ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        subtitle={formatDashboardPeriod(period)}
        back
        onBack={() => guard.request(leave)}
      />
      <Card tone="info" style={[styles.intro, compact && styles.introCompact]}>
        <View style={styles.introIcon}>
          <Ionicons name="pie-chart-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.grow}>
          <Text style={typography.cardTitle}>{id ? 'Ajusta tu límite' : 'Dale dirección a tus gastos'}</Text>
          <Text style={typography.bodySecondary}>
            {compact
              ? 'Categoría padre → subcategoría → límite mensual.'
              : 'Elige una categoría padre, después una subcategoría y su límite mensual. Verás el gasto real de cada una.'}
          </Text>
        </View>
      </Card>
      <Card style={styles.section}>
        <Text style={typography.cardTitle}>1. Categoría padre</Text>
        <Text style={typography.bodySecondary}>
          Es el grupo general, por ejemplo Alimentación o Transporte.
        </Text>
        <SelectField
          label="Categoría padre"
          value={
            selectedParent?.name ??
            parentCategoryName ??
            (id && selectedScope === 'group' ? categoryName : undefined)
          }
          disabled={!!id}
          onPress={() => setOpen('parent')}
        />
        {!id ? (
          <Button variant="ghost" size="compact" onPress={() => setQuickCategory('parent')}>
            + Crear categoría padre
          </Button>
        ) : null}
      </Card>
      {selectedParentId ? (
        <Card style={styles.section}>
          <Text style={typography.cardTitle}>2. ¿Qué límite quieres definir?</Text>
          {!id ? (
            <View style={styles.scopeChoices}>
              {(
                [
                  [
                    'subcategory',
                    'Una subcategoría',
                    'Ej. Desayunos dentro de Alimentación',
                    'pricetag-outline',
                  ],
                  ['group', 'Todo el grupo', 'Un techo general para sus subcategorías', 'folder-outline'],
                ] as const
              ).map(([value, title, hint, icon]) => (
                <MotionPressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={title}
                  accessibilityState={{ checked: scope === value }}
                  onPress={() => {
                    setScope(value);
                    setCategory(value === 'group' ? selectedParentId : 0);
                    setCategoryError('');
                  }}
                  style={[styles.scopeChoice, scope === value && styles.categorySelected]}
                >
                  <Ionicons name={icon} color={colors.primary} size={21} />
                  <View style={styles.grow}>
                    <Text style={typography.label}>{title}</Text>
                    <Text style={typography.caption}>{hint}</Text>
                  </View>
                  <Ionicons
                    name={scope === value ? 'radio-button-on' : 'radio-button-off'}
                    color={colors.primary}
                    size={20}
                  />
                </MotionPressable>
              ))}
            </View>
          ) : null}
          {selectedScope === 'subcategory' ? (
            <>
              <SelectField
                label="Subcategoría"
                value={selectedCategory?.name ?? (id ? categoryName : undefined)}
                disabled={!!id}
                onPress={() => setOpen('child')}
              />
              {!id ? (
                <>
                  {!children.length && !categories.isPending ? (
                    <Text style={typography.caption}>
                      Este grupo aún no tiene subcategorías. Crea la primera para definir su límite.
                    </Text>
                  ) : null}
                  <Button variant="ghost" size="compact" onPress={() => setQuickCategory('child')}>
                    + Crear subcategoría en {selectedParent?.name ?? 'este grupo'}
                  </Button>
                </>
              ) : null}
            </>
          ) : (
            <Text style={typography.bodySecondary}>
              El techo de {selectedParent?.name ?? categoryName ?? 'este grupo'} cuenta sus gastos y los de
              sus subcategorías. Los límites individuales sirven de detalle y no se suman encima.
            </Text>
          )}
          {id && selectedScope === 'group' && !children.length ? (
            <Text style={typography.caption}>
              Esta categoría existente todavía no tiene subcategorías. Conserva su presupuesto y sus
              movimientos.
            </Text>
          ) : null}
        </Card>
      ) : null}
      {categoryError ? (
        <Text accessibilityLiveRegion="polite" style={styles.guidance}>
          {categoryError}
        </Text>
      ) : null}
      {existingBudget ? (
        <Card tone="info" style={styles.section}>
          <Text style={typography.cardTitle}>Este presupuesto ya existe</Text>
          <Text style={typography.bodySecondary}>
            Puedes consultar y editar el límite de {existingBudget.categoryName} para este mes sin crear otro.
          </Text>
          <Button
            variant="secondary"
            onPress={() =>
              router.replace({
                pathname: '/(app)/budget-detail',
                params: {
                  id: String(existingBudget.id),
                  year: String(period.year),
                  month: String(period.month),
                },
              })
            }
          >
            Ver presupuesto existente
          </Button>
        </Card>
      ) : null}
      <Card style={styles.section}>
        <Text style={typography.cardTitle}>3. Límite mensual</Text>
        <MoneyInput
          label="Límite mensual"
          currency="COP"
          value={amount}
          onChangeText={(next) => {
            setAmount(next);
            setAmountError('');
          }}
          error={amountError}
          helperText={
            category
              ? `${selectedParent?.name ?? categoryName ?? 'Categoría'}${selectedScope === 'subcategory' ? ` › ${selectedCategory?.name ?? categoryName ?? 'Subcategoría'}` : ' · techo del grupo'}. Puedes ajustarlo después.`
              : 'Selecciona la categoría padre y la subcategoría que quieres presupuestar.'
          }
        />
      </Card>
      <Text style={typography.caption}>
        Los presupuestos actuales solo cuentan gastos registrados en COP. No se convierte ni se mezcla dinero
        de otras monedas.
      </Text>
      <Button
        loading={mutation.isPending || update.isPending}
        disabled={mutation.isPending || update.isPending || Boolean(existingBudget)}
        onPress={() => {
          if (submitting.current) return;
          if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            setAmountError('Ingresa un límite mayor que cero.');
            return;
          }
          if (!id && (!selectedParentId || !category)) {
            setCategoryError(
              !selectedParentId
                ? 'Selecciona una categoría padre.'
                : 'Selecciona o crea una subcategoría, o elige Todo el grupo.',
            );
            return;
          }
          if (existingBudget) return;
          if (id && version !== undefined && version !== '') {
            submitting.current = true;
            update.mutate(
              { id: Number(id), data: { limitAmount: Number(amount), version: Number(version) } },
              {
                onSuccess: () => {
                  if (!active()) return;
                  setAmount('');
                  update.reset();
                  feedback.show('Presupuesto actualizado.', 'success');
                  leave();
                },
                onError: () => {
                  if (active())
                    feedback.show(
                      'No pudimos actualizar el presupuesto. Revisa los datos e inténtalo de nuevo.',
                      'error',
                    );
                },
                onSettled: () => {
                  submitting.current = false;
                },
              },
            );
          } else if (!id && category) {
            submitting.current = true;
            mutation.mutate(
              { categoryId: category, year: period.year, month: period.month, limitAmount: Number(amount) },
              {
                onSuccess: () => {
                  if (!active()) return;
                  setAmount('');
                  setCategory(0);
                  mutation.reset();
                  feedback.show('¡Buen comienzo! Tu presupuesto ya está listo.', 'success');
                  tour?.completeStep?.('add-budget');
                  leave();
                },
                onError: () => {
                  if (active())
                    feedback.show(
                      'No pudimos crear el presupuesto. Revisa los datos e inténtalo de nuevo.',
                      'error',
                    );
                },
                onSettled: () => {
                  submitting.current = false;
                },
              },
            );
          }
        }}
      >
        {id ? 'Guardar cambios' : 'Crear presupuesto'}
      </Button>
      <ModalSelector
        visible={open !== null}
        label={open === 'child' ? 'Subcategoría' : 'Categoría padre'}
        subtitle={
          open === 'child'
            ? `Elige dentro de ${selectedParent?.name ?? 'este grupo'}.`
            : 'Primero elige el grupo general de tu presupuesto.'
        }
        loading={categories.isPending}
        selectedId={open === 'child' ? category : selectedParentId}
        options={(categories.data ?? [])
          .filter(
            (x) =>
              x.id !== undefined &&
              (open === 'child' ? x.parentCategoryId === selectedParentId : x.parentCategoryId == null),
          )
          .map((x) => ({
            id: x.id!,
            label: x.name ?? 'Categoría',
            subtitle:
              open === 'child'
                ? `Dentro de ${selectedParent?.name ?? 'este grupo'}${budgets.data?.some((budget) => budget.categoryId === x.id) ? ' · ya tiene presupuesto este mes' : ''}`
                : `${(categories.data ?? []).filter((child) => child.parentCategoryId === x.id).length} subcategorías`,
            icon: savedCategoryAppearance(x).icon,
          }))}
        onClose={() => setOpen(null)}
        onSelect={(value) => {
          if (open === 'parent') {
            setParent(value);
            setCategory(scope === 'group' ? value : 0);
          } else setCategory(value);
          setCategoryError('');
        }}
        emptyActionLabel={open === 'child' ? 'Crear subcategoría' : 'Crear categoría padre'}
        onEmptyAction={() => {
          setQuickCategory(open === 'child' ? 'child' : 'parent');
          setOpen(null);
        }}
      />
      <QuickCategoryModal
        visible={quickCategory !== null}
        type="EXPENSE"
        lockedParentCategoryId={quickCategory === 'child' ? selectedParentId : undefined}
        rootOnly={quickCategory === 'parent'}
        onClose={() => setQuickCategory(null)}
        onCreated={(categoryId) => {
          if (quickCategory === 'parent') {
            setParent(categoryId);
            setCategory(scope === 'group' ? categoryId : 0);
          } else setCategory(categoryId);
          setCategoryError('');
          setQuickCategory(null);
        }}
      />
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  intro: {
    flexDirection: 'row' as const,
    gap: spacing.md,
    padding: spacing.lg,
    alignItems: 'center' as const,
  },
  introCompact: { flexDirection: 'column' as const, alignItems: 'flex-start' as const, gap: spacing.sm },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.medium,
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  grow: { flex: 1, gap: spacing.xs },
  section: { padding: spacing.lg, gap: spacing.lg },
  scopeChoices: { gap: spacing.sm },
  scopeChoice: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  categorySelected: { borderColor: colors.success, backgroundColor: colors.successSoft },
  guidance: { ...typography.caption, color: colors.warning },
}));

export default withFormSession(BudgetForm);
