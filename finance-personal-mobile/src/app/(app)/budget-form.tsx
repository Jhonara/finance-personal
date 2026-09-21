import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCategories } from '@/features/categories/use-categories';
import { useCreateBudget, useUpdateBudget } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { ModalSelector } from '@/ui/modal-selector';
import { QuickCategoryModal } from '@/ui/quick-category-modal';
import { Button, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { Text } from 'react-native';
import { colors, spacing, typography } from '@/theme';
function BudgetForm() {
  const { id, version, limit, categoryId, categoryName, year, month } = useLocalSearchParams<{
    id?: string;
    version?: string;
    limit?: string;
    categoryId?: string;
    categoryName?: string;
    year?: string;
    month?: string;
  }>();
  const [amount, setAmount] = useState(id ? (limit ?? '') : '');
  const [category, setCategory] = useState<number>(id ? Number(categoryId) : 0);
  const active = useFormSessionActive();
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [quickCategory, setQuickCategory] = useState(false);
  const categories = useCategories('EXPENSE');
  const mutation = useCreateBudget();
  const update = useUpdateBudget();
  const feedback = useFeedback();
  const [period] = useState(() =>
    year && month ? { year: Number(year), month: Number(month) } : currentDashboardPeriod(),
  );
  return (
    <Screen scroll keyboard>
      <ScreenHeader
        title={id ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        subtitle={id ? undefined : 'Define cuánto quieres destinar a una categoría este mes.'}
        back
        onBack={() => router.back()}
      />
      <SelectField
        label="Categoría de gasto"
        value={
          id
            ? categoryName || categories.data?.find((x) => x.id === category)?.name
            : categories.data?.find((x) => x.id === category)?.name
        }
        disabled={!!id}
        onPress={() => setOpen(true)}
      />
      {!categories.isPending && !(categories.data ?? []).length ? (
        <Text style={styles.guidance}>Crea una categoría de gasto antes de definir un presupuesto.</Text>
      ) : null}
      <MoneyInput label="Límite mensual" value={amount} onChangeText={setAmount} />
      <Button
        loading={mutation.isPending || update.isPending}
        disabled={mutation.isPending || update.isPending}
        onPress={() => {
          if (submitting.current) return;
          if (id && version !== undefined && version !== '' && Number(amount) > 0) {
            submitting.current = true;
            update.mutate(
              { id: Number(id), data: { limitAmount: Number(amount), version: Number(version) } },
              {
                onSuccess: () => {
                  if (!active()) return;
                  setAmount('');
                  update.reset();
                  feedback.show('Presupuesto actualizado.');
                  router.back();
                },
                onError: () => {
                  if (active())
                    feedback.show(
                      'No pudimos actualizar el presupuesto. Revisa los datos e inténtalo de nuevo.',
                    );
                },
                onSettled: () => {
                  submitting.current = false;
                },
              },
            );
          } else if (!id && category && Number(amount) > 0) {
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
                  router.back();
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
        onSelect={setCategory}
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
          setQuickCategory(false);
        }}
      />
    </Screen>
  );
}

const styles = { guidance: { ...typography.caption, marginTop: -spacing.md, color: colors.warning } };

export default withFormSession(BudgetForm);
