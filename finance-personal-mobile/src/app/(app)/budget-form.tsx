import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useCategories } from '@/features/categories/use-categories';
import { useCreateBudget, useUpdateBudget } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { ModalSelector } from '@/ui/modal-selector';
import { Button, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
export default function BudgetForm() {
  const [amount, setAmount] = useState('');
  const { id, version, limit } = useLocalSearchParams<{ id?: string; version?: string; limit?: string }>();
  const [category, setCategory] = useState<number>();
  const [open, setOpen] = useState(false);
  const categories = useCategories('EXPENSE');
  const mutation = useCreateBudget();
  const update = useUpdateBudget();
  const feedback = useFeedback();
  const period = currentDashboardPeriod();
  return (
    <Screen scroll keyboard>
      <ScreenHeader title="Nuevo presupuesto" back onBack={() => router.back()} />
      <SelectField
        label="Categoría de gasto"
        value={categories.data?.find((x) => x.id === category)?.name}
        onPress={() => setOpen(true)}
      />
      <MoneyInput label="Límite mensual" value={amount || limit || ''} onChangeText={setAmount} />
      <Button
        loading={mutation.isPending || update.isPending}
        disabled={mutation.isPending || update.isPending}
        onPress={() => {
          if (id && version && Number(amount || limit)) {
            update.mutate(
              { id: Number(id), data: { limitAmount: Number(amount || limit), version: Number(version) } },
              {
                onSuccess: () => {
                  feedback.show('Presupuesto actualizado.');
                  router.back();
                },
                onError: () => feedback.show('Este presupuesto cambió desde que lo abriste.'),
              },
            );
          } else if (category && Number(amount))
            mutation.mutate(
              { categoryId: category, year: period.year, month: period.month, limitAmount: Number(amount) },
              {
                onSuccess: () => {
                  feedback.show('Presupuesto creado.');
                  router.back();
                },
              },
            );
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
      />
    </Screen>
  );
}
