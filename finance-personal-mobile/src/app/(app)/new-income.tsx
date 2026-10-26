import { themedStyleSheet } from '@/theme/themed-styles';
import { hasFormChanges, useUnsavedForm } from '@/features/forms/use-unsaved-form';
import { accountTypeLabel } from '@/features/accounts/account-presentation';
import { openForm } from '@/features/forms/form-session';
import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import {
  MovementDraftGate,
  MovementDraftStatus,
  useMovementDraft,
} from '@/features/forms/use-movement-draft';
import { useState } from 'react';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { applyApiFieldErrors } from '@/auth/form-errors';
import { accountKeys, useAccounts } from '@/features/accounts/use-accounts';
import { useCategories } from '@/features/categories/use-categories';
import { useIncomeMutation } from '@/features/mutations';
import { financialErrorMessage, unavailableResource } from '@/features/transactions/form-errors';
import { useFeedback } from '@/feedback/feedback-provider';
import { useTour } from '@/features/onboarding/tour-context';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ModalSelector } from '@/ui/modal-selector';
import { QuickCategoryModal } from '@/ui/quick-category-modal';
import { Button, Input, MoneyInput, Screen, SelectField } from '@/ui/primitives';
import {
  MovementAmountPanel,
  MovementFormHeader,
  MovementFormIntro,
  MovementFormSection,
  MovementOptionalDetails,
} from '@/ui/movement-form';
import { localDateFromNative } from '@/utils/local-date';
import { colors, spacing, typography } from '@/theme';
type Form = {
  amount: string;
  accountId?: number;
  categoryId?: number;
  incomeDate: string;
  description: string;
};
const leaveForm = () => (router.canGoBack() ? router.back() : router.replace('/(app)'));
function NewIncomeScreen({ userId }: { userId: number }) {
  const activeSession = useFormSessionActive();
  const [initialDate] = useState(() => localDateFromNative(new Date()));
  const form = useForm<Form>({
    defaultValues: { amount: '', incomeDate: initialDate, description: '' },
  });
  const draft = useMovementDraft(form, userId, 'income', 'incomeDate', initialDate);
  const [selector, setSelector] = useState<'account' | 'category' | 'quickCategory' | null>(null);
  const [createdCategoryId, setCreatedCategoryId] = useState<number>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const accounts = useAccounts();
  const categories = useCategories('INCOME');
  const mutation = useIncomeMutation();
  const feedback = useFeedback();
  const tour = useTour();
  const client = useQueryClient();
  const guard = useUnsavedForm({
    dirty: hasFormChanges(form.watch(), form.formState.defaultValues),
    busy: mutation.isPending || completing,
    suspended: selector !== null,
    enabled: draft.mode === 'editing',
    onBack: leaveForm,
    leaveTitle: '¿Salir del ingreso?',
    leaveMessage: 'Este ingreso quedará como borrador en este dispositivo.',
    leaveLabel: 'Guardar borrador y salir',
    beforeLeave: draft.flush,
  });
  const submit = form.handleSubmit((data) => {
    if (mutation.isPending || completing) return;
    const parsedAmount = Number(data.amount);
    const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
    const validCategory =
      (createdCategoryId !== undefined && data.categoryId === createdCategoryId) ||
      categories.data?.some((item) => item.active !== false && item.id === data.categoryId);
    if (!data.accountId || !validAmount || !validCategory) {
      if (!data.accountId) form.setError('accountId', { message: 'Selecciona una cuenta.' });
      if (!validAmount) form.setError('amount', { message: 'Ingresa un monto mayor que cero.' });
      if (!validCategory) form.setError('categoryId', { message: 'Elige una categoría para este ingreso.' });
      return;
    }
    mutation.mutate(
      {
        amount: parsedAmount,
        accountId: data.accountId,
        categoryId: data.categoryId,
        incomeDate: data.incomeDate,
        incomeType: 'SALARY',
        description: data.description || undefined,
      },
      {
        onSuccess: async () => {
          setCompleting(true);
          let draftCleared = true;
          try {
            await draft.finish();
          } catch {
            draftCleared = false;
          }
          if (!activeSession()) return;
          form.reset({ amount: '', incomeDate: localDateFromNative(new Date()), description: '' });
          mutation.reset();
          setSelector(null);
          feedback.show(
            draftCleared
              ? 'Ingreso registrado.'
              : 'Ingreso registrado. No pudimos borrar el borrador: no lo registres otra vez.',
            draftCleared ? 'success' : 'error',
          );
          tour?.completeStep?.('new-movement');
          leaveForm();
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
            setCreatedCategoryId(undefined);
            form.setError('categoryId', { message: 'Elige otra categoría activa.' });
            void categories.refetch();
          }
          if (message) feedback.show(message, 'error');
        },
      },
    );
  });
  const account = accounts.data?.find((x) => x.id === form.watch('accountId'));
  const category = categories.data?.find((x) => x.id === form.watch('categoryId'));
  if (draft.mode !== 'editing')
    return (
      <MovementDraftStatus
        kind="income"
        mode={draft.mode}
        onContinue={draft.continueDraft}
        onNew={() => void draft.createNew()}
        onRetry={() => void draft.retry()}
      />
    );
  return (
    <Screen entry scroll keyboard>
      <MovementFormHeader title="Nuevo ingreso" onBack={() => guard.request(leaveForm)} />
      <View style={styles.form}>
        <MovementFormIntro
          kind="income"
          title="¿Cuánto recibiste?"
          description="Guarda el ingreso en la cuenta correcta."
        />
        <MovementAmountPanel kind="income">
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <MoneyInput
                label="Monto recibido"
                placeholder="0"
                currency={account?.currency ?? 'COP'}
                value={field.value}
                onChangeText={(value) => {
                  field.onChange(value);
                  form.clearErrors('amount');
                }}
                error={form.formState.errors.amount?.message}
              />
            )}
          />
        </MovementAmountPanel>
        <MovementFormSection
          title="Cuenta de entrada"
          subtitle="¿Dónde recibiste el dinero?"
          icon="wallet-outline"
        >
          <SelectField
            label="Cuenta"
            value={account?.name}
            placeholder="Selecciona una cuenta"
            onPress={() => setSelector('account')}
          />
          {form.formState.errors.accountId?.message ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {form.formState.errors.accountId.message}
            </Text>
          ) : null}
          {!accounts.isPending && !(accounts.data ?? []).some((item) => item.active) ? (
            <Text style={styles.guidance}>Primero crea una cuenta para registrar tus movimientos.</Text>
          ) : null}
        </MovementFormSection>
        <MovementFormSection
          title="Categoría"
          subtitle="Necesaria para organizar tus ingresos."
          icon="pricetag-outline"
        >
          <SelectField
            label="Categoría"
            value={
              category?.name ??
              (createdCategoryId !== undefined && form.watch('categoryId') === createdCategoryId
                ? 'Categoría nueva'
                : undefined)
            }
            placeholder="Elegir categoría"
            onPress={() => setSelector('category')}
          />
          {form.formState.errors.categoryId?.message ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {form.formState.errors.categoryId.message}
            </Text>
          ) : null}
        </MovementFormSection>
        <MovementOptionalDetails open={detailsOpen} onToggle={() => setDetailsOpen((open) => !open)}>
          <MovementFormSection
            title="Completa los detalles"
            subtitle="La fecha es hoy por defecto."
            icon="pricetag-outline"
          >
            <Controller
              control={form.control}
              name="incomeDate"
              render={({ field }) => (
                <FinancialDateField
                  label="Fecha"
                  value={field.value}
                  onChange={field.onChange}
                  error={form.formState.errors.incomeDate?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <Input
                  label="Nota (opcional)"
                  placeholder="Ej. Nómina o trabajo freelance"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={form.formState.errors.description?.message}
                />
              )}
            />
          </MovementFormSection>
        </MovementOptionalDetails>
        <Button
          loading={mutation.isPending || completing}
          disabled={mutation.isPending || completing}
          onPress={submit}
        >
          Registrar ingreso
        </Button>
        {draft.saveError ? (
          <Text style={styles.error}>
            No pudimos guardar los cambios en este dispositivo. Revisa el espacio disponible.
          </Text>
        ) : null}
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
        emptyTitle="Aún no tienes cuentas"
        emptyDescription="Crea una cuenta para registrar dónde recibes tu dinero."
        emptyActionLabel="+ Crear cuenta"
        onEmptyAction={() => {
          setSelector(null);
          openForm('/(app)/account-form');
        }}
        onSelect={(id) => {
          form.setValue('accountId', id);
          form.clearErrors('accountId');
        }}
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
        emptyActionLabel="+ Crear categoría"
        onEmptyAction={() => {
          setSelector('quickCategory');
        }}
        onSelect={(id) => {
          setCreatedCategoryId(undefined);
          form.setValue('categoryId', id);
          form.clearErrors('categoryId');
        }}
      />
      <QuickCategoryModal
        visible={selector === 'quickCategory'}
        type="INCOME"
        onClose={() => setSelector(null)}
        onCreated={(id) => {
          setCreatedCategoryId(id);
          form.setValue('categoryId', id);
          form.clearErrors('categoryId');
          setSelector(null);
        }}
      />
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  form: { gap: spacing.lg, paddingTop: spacing.sm },
  guidance: { ...typography.caption, color: colors.warning },
  error: { ...typography.caption, color: colors.danger },
}));

export default withFormSession(function IncomeDraftRoute() {
  return (
    <MovementDraftGate kind="income">{(userId) => <NewIncomeScreen userId={userId} />}</MovementDraftGate>
  );
});
