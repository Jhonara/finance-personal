import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCategories } from '@/features/categories/use-categories';
import { useCreateBudget, useUpdateBudget } from '@/features/secondary/use-secondary';
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
import { categoryAppearance } from '@/features/categories/category-appearance';
import { colors, radius, spacing, typography } from '@/theme';
function BudgetForm() {
  const { id, version, limit, categoryId, categoryName, year, month, source } = useLocalSearchParams<{
    id?: string;
    version?: string;
    limit?: string;
    categoryId?: string;
    categoryName?: string;
    year?: string;
    month?: string;
    source?: string;
  }>();
  const [amount, setAmount] = useState(id ? (limit ?? '') : '');
  const [category, setCategory] = useState<number>(id ? Number(categoryId) : 0);
  const active = useFormSessionActive();
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [quickCategory, setQuickCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [amountError, setAmountError] = useState('');
  const categories = useCategories('EXPENSE');
  const mutation = useCreateBudget();
  const update = useUpdateBudget();
  const feedback = useFeedback();
  const tour = useTour();
  const [period] = useState(() => dashboardPeriodFromParams(year, month) ?? currentDashboardPeriod());
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
  return (
    <Screen scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title={id ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        subtitle={formatDashboardPeriod(period)}
        back
        onBack={leave}
      />
      <Card tone="info" style={[styles.intro, compact && styles.introCompact]}>
        <View style={styles.introIcon}>
          <Ionicons name="pie-chart-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.grow}>
          <Text style={typography.cardTitle}>{id ? 'Ajusta tu límite' : 'Dale dirección a tus gastos'}</Text>
          <Text style={typography.bodySecondary}>
            {compact
              ? 'Elige una categoría y un límite mensual en COP.'
              : 'Elige una categoría y un límite mensual en COP. Verás el avance con tus movimientos reales.'}
          </Text>
        </View>
      </Card>
      <Card style={styles.section}>
        <Text style={typography.cardTitle}>1. ¿Qué quieres planear?</Text>
        {!id && Boolean(categories.data?.length) && (
          <>
            <Text style={typography.bodySecondary}>Elige una de tus categorías de gasto.</Text>
            <View style={styles.categoryGrid}>
              {categories.data
                ?.filter((item) => item.id !== undefined)
                .slice(0, 4)
                .map((item) => (
                  <MotionPressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Seleccionar ${item.name ?? 'categoría'}`}
                    accessibilityState={{ selected: category === item.id }}
                    onPress={() => {
                      setCategory(item.id!);
                      setCategoryError('');
                    }}
                    style={[styles.categoryChoice, category === item.id && styles.categorySelected]}
                  >
                    <View style={[styles.choiceIcon, category === item.id && styles.choiceIconSelected]}>
                      <Ionicons
                        name={category === item.id ? 'checkmark-circle' : categoryAppearance(item.name).icon}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <Text numberOfLines={2} style={typography.label}>
                      {item.name ?? 'Categoría'}
                    </Text>
                  </MotionPressable>
                ))}
            </View>
          </>
        )}
        <SelectField
          label={id ? 'Categoría de gasto' : 'Ver todas las categorías'}
          value={
            id
              ? categoryName || categories.data?.find((x) => x.id === category)?.name
              : categories.data?.find((x) => x.id === category)?.name
          }
          disabled={!!id}
          onPress={() => setOpen(true)}
        />
        {categoryError ? (
          <Text accessibilityLiveRegion="polite" style={styles.guidance}>
            {categoryError}
          </Text>
        ) : null}
        {!categories.isPending && !(categories.data ?? []).length ? (
          <Text style={styles.guidance}>Crea una categoría de gasto antes de definir un presupuesto.</Text>
        ) : null}
        {!id ? (
          <Button variant="ghost" size="compact" onPress={() => setQuickCategory(true)}>
            + Crear categoría de gasto
          </Button>
        ) : null}
      </Card>
      <Card style={styles.section}>
        <Text style={typography.cardTitle}>2. Define tu límite</Text>
        <MoneyInput
          label="Límite mensual"
          currency="COP"
          value={amount}
          onChangeText={(next) => {
            setAmount(next);
            setAmountError('');
          }}
          error={amountError}
          helperText="Puedes cambiarlo cuando lo necesites."
        />
      </Card>
      <Text style={typography.caption}>
        Los presupuestos actuales solo cuentan gastos registrados en COP. No se convierte ni se mezcla dinero
        de otras monedas.
      </Text>
      <Button
        loading={mutation.isPending || update.isPending}
        disabled={mutation.isPending || update.isPending}
        onPress={() => {
          if (submitting.current) return;
          if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            setAmountError('Ingresa un límite mayor que cero.');
            return;
          }
          if (!id && !category) {
            setCategoryError('Selecciona una categoría de gasto.');
            return;
          }
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
        visible={open}
        label="Categoría de gasto"
        loading={categories.isPending}
        options={(categories.data ?? [])
          .filter((x) => x.id !== undefined)
          .map((x) => ({ id: x.id!, label: x.name ?? 'Categoría' }))}
        onClose={() => setOpen(false)}
        onSelect={(value) => {
          setCategory(value);
          setCategoryError('');
        }}
        emptyActionLabel="Crear categoría de gasto"
        onEmptyAction={() => {
          setOpen(false);
          setQuickCategory(true);
        }}
      />
      <QuickCategoryModal
        visible={quickCategory}
        type="EXPENSE"
        onClose={() => setQuickCategory(false)}
        onCreated={(categoryId) => {
          setCategory(categoryId);
          setCategoryError('');
          setQuickCategory(false);
        }}
      />
    </Screen>
  );
}

const styles = {
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
  categoryGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: spacing.sm },
  categoryChoice: {
    flexBasis: '47%' as const,
    flexGrow: 1,
    minWidth: 118,
    minHeight: 82,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  categorySelected: { borderColor: colors.success, backgroundColor: colors.successSoft },
  choiceIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
  },
  choiceIconSelected: { backgroundColor: colors.mint },
  guidance: { ...typography.caption, color: colors.warning },
};

export default withFormSession(BudgetForm);
