import { accountTypeLabel } from '@/features/accounts/account-presentation';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useState } from 'react';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { applyApiFieldErrors } from '@/auth/form-errors';
import { accountKeys, useAccounts } from '@/features/accounts/use-accounts';
import { useCategories } from '@/features/categories/use-categories';
import { useExpenseMutation } from '@/features/mutations';
import { financialErrorMessage, unavailableResource } from '@/features/transactions/form-errors';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, spacing, typography } from '@/theme';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ModalSelector } from '@/ui/modal-selector';
import { QuickCategoryModal } from '@/ui/quick-category-modal';
import { Button, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { localDateFromNative } from '@/utils/local-date';

type Form = {
  amount: string;
  accountId?: number;
  categoryId?: number;
  expenseDate: string;
  description: string;
};
function NewExpenseScreen() {
  const activeSession = useFormSessionActive();
  const form = useForm<Form>({
    defaultValues: { amount: '', expenseDate: localDateFromNative(new Date()), description: '' },
  });
  const [selector, setSelector] = useState<'account' | 'category' | 'quickCategory' | null>(null);
  const accounts = useAccounts();
  const categories = useCategories('EXPENSE');
  const mutation = useExpenseMutation();
  const feedback = useFeedback();
  const client = useQueryClient();
  const submit = form.handleSubmit((data) => {
    if (!data.accountId || !Number(data.amount)) {
      if (!data.accountId) form.setError('accountId', { message: 'Selecciona una cuenta.' });
      if (!Number(data.amount)) form.setError('amount', { message: 'Ingresa un monto válido.' });
      return;
    }
    mutation.mutate(
      {
        amount: Number(data.amount),
        accountId: data.accountId,
        categoryId: data.categoryId,
        expenseDate: data.expenseDate,
        paymentType: 'CASH',
        expenseType: 'VARIABLE',
        description: data.description || undefined,
      },
      {
        onSuccess: () => {
          if (!activeSession()) return;
          form.reset({ amount: '', expenseDate: localDateFromNative(new Date()), description: '' });
          mutation.reset();
          setSelector(null);
          feedback.show('Gasto registrado.', 'success');
          router.back();
        },
        onError: (error) => {
          if (!activeSession()) return;
          applyApiFieldErrors(error, form.setError);
          const resource = unavailableResource(error);
          const message = financialErrorMessage(error, resource);
          if (resource === 'account') {
            form.setValue('accountId', undefined);
            void client.invalidateQueries({ queryKey: accountKeys.all });
          }
          if (resource === 'category') {
            form.setValue('categoryId', undefined);
            void categories.refetch();
          }
          if (message) feedback.show(message, 'error');
        },
      },
    );
  });
  const selectedAccount = accounts.data?.find((item) => item.id === form.watch('accountId'));
  const selectedCategory = categories.data?.find((item) => item.id === form.watch('categoryId'));
  return (
    <Screen scroll keyboard>
      <ScreenHeader
        title="Nuevo gasto"
        subtitle="Registra una salida de dinero"
        back
        onBack={() => router.back()}
      />
      <View style={styles.form}>
        <View style={styles.help}>
          <Text style={typography.cardTitle}>Registra lo que gastaste</Text>
          <Text style={typography.bodySecondary}>
            Elige la cuenta desde la que salió el dinero y una categoría para entender mejor tus hábitos.
          </Text>
        </View>
        <Controller
          control={form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput label="Monto" value={field.value} onChangeText={field.onChange} />
          )}
        />
        {form.formState.errors.amount?.message && <Text>{form.formState.errors.amount.message}</Text>}
        <SelectField
          label="Cuenta"
          value={selectedAccount?.name}
          placeholder="Selecciona una cuenta"
          onPress={() => setSelector('account')}
        />
        {form.formState.errors.accountId?.message && <Text>{form.formState.errors.accountId.message}</Text>}
        {!accounts.isPending && !(accounts.data ?? []).some((account) => account.active) ? (
          <Text style={styles.guidance}>Primero crea una cuenta para registrar tus movimientos.</Text>
        ) : null}
        <SelectField
          label="Categoría"
          value={selectedCategory?.name}
          placeholder="Selecciona una categoría"
          onPress={() => setSelector('category')}
        />
        <Controller
          control={form.control}
          name="expenseDate"
          render={({ field }) => (
            <FinancialDateField
              label="Fecha"
              value={field.value}
              onChange={field.onChange}
              error={form.formState.errors.expenseDate?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <Input
              label="Descripción"
              placeholder="Ej. Almuerzo, gasolina, Netflix"
              value={field.value}
              onChangeText={field.onChange}
              error={form.formState.errors.description?.message}
            />
          )}
        />
        <Button loading={mutation.isPending} disabled={mutation.isPending} onPress={submit}>
          Registrar gasto
        </Button>
      </View>
      <ModalSelector
        visible={selector === 'account'}
        label="Cuenta"
        loading={accounts.isPending}
        options={(accounts.data ?? [])
          .filter((x) => x.active && x.id !== undefined)
          .map((x) => ({
            id: x.id!,
            label: x.name ?? 'Cuenta',
            subtitle: `${accountTypeLabel(x.type)} · ${x.currency ?? 'COP'}`,
            icon: 'wallet-outline',
          }))}
        selectedId={form.watch('accountId')}
        onClose={() => setSelector(null)}
        onSelect={(id) => form.setValue('accountId', id)}
      />
      <ModalSelector
        visible={selector === 'category'}
        label="Categoría"
        loading={categories.isPending}
        options={(categories.data ?? [])
          .filter((x) => x.id !== undefined)
          .map((x) => ({ id: x.id!, label: x.name ?? 'Categoría', icon: 'pricetag-outline' }))}
        selectedId={form.watch('categoryId')}
        onClose={() => setSelector(null)}
        emptyActionLabel="Crear categoría"
        onEmptyAction={() => {
          setSelector('quickCategory');
        }}
        onSelect={(id) => form.setValue('categoryId', id)}
      />
      <QuickCategoryModal
        visible={selector === 'quickCategory'}
        type="EXPENSE"
        onClose={() => setSelector(null)}
        onCreated={(id) => {
          form.setValue('categoryId', id);
          setSelector(null);
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingTop: spacing.md },
  help: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.dangerSoft,
  },
  guidance: { ...typography.caption, marginTop: -spacing.md, color: colors.warning },
});

export default withFormSession(NewExpenseScreen);
