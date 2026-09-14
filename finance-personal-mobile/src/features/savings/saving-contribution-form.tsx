import { useRef, useState } from 'react';
import { Modal, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, toApiError } from '@/api/errors';
import type { SavingGoal } from '@/features/secondary/secondary-api';
import { useContributeSaving } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';
import { spacing, typography } from '@/theme';
import { requestAmount, savingsAmount } from './savings-money';
import { savingContributionSchema } from './savings-schemas';
import { presentSavingGoal } from './savings-presentation';

export function SavingContributionForm({
  visible,
  goal,
  completed,
  onClose,
  onReview,
  onSaved,
}: {
  visible: boolean;
  goal: SavingGoal;
  completed: boolean;
  onClose(): void;
  onReview(): Promise<void>;
  onSaved(before: SavingGoal, after: SavingGoal): Promise<void>;
}) {
  const form = useForm({
    defaultValues: { amount: '', movementDate: localDateFromNative(new Date()) },
    resolver: zodResolver(savingContributionSchema),
  });
  const mutation = useContributeSaving();
  const feedback = useFeedback();
  const { hidden } = usePrivacy();
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const close = () => {
    if (!submitting.current) onClose();
  };
  const submit = () => {
    if (submitting.current || uncertain || completed || goal.id === undefined) return;
    submitting.current = true;
    void form.handleSubmit(
      async (data) => {
        const amount = requestAmount(data.amount);
        if (amount === undefined || goal.id === undefined) {
          submitting.current = false;
          return;
        }
        const before = { ...goal };
        setError('');
        try {
          const after = await mutation.mutateAsync({
            id: goal.id,
            data: { amount, movementDate: data.movementDate },
          });
          form.reset({ amount: '', movementDate: localDateFromNative(new Date()) });
          feedback.show('Aporte registrado', 'success');
          await onSaved(before, after);
        } catch (cause) {
          const failure = cause instanceof ApiError ? cause : toApiError(cause);
          const unknown = failure.status === null || failure.status >= 500;
          setUncertain(unknown);
          setReviewed(false);
          setError(
            unknown
              ? 'No pudimos confirmar el aporte. Revisa el progreso antes de intentar otro envío.'
              : failure.status === 409
                ? 'La meta cambió mientras aportabas. Actualiza el progreso antes de reintentar.'
                : failure.status === 404
                  ? 'Esta meta ya no está disponible.'
                  : 'No pudimos registrar el aporte. Revisa el monto y la fecha.',
          );
          for (const field of ['amount', 'movementDate'] as const) {
            if (failure.fieldErrors[field]) form.setError(field, { message: failure.fieldErrors[field] });
          }
        } finally {
          submitting.current = false;
        }
      },
      () => {
        submitting.current = false;
      },
    )();
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <Screen scroll keyboard style={{ gap: spacing.lg }}>
        <ScreenHeader title="Nuevo aporte" subtitle={goal.name} back onBack={close} />
        <Text style={typography.cardTitle}>Progreso actual · {presentSavingGoal(goal).percentageLabel}</Text>
        <Text style={typography.bodySecondary}>Ahorrado · {savingsAmount(goal.currentAmount, hidden)}</Text>
        <Controller
          control={form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              label="Monto del aporte"
              placeholder="0"
              currency=""
              value={field.value}
              onChangeText={field.onChange}
              error={form.formState.errors.amount?.message}
              disabled={mutation.isPending}
            />
          )}
        />
        <Controller
          control={form.control}
          name="movementDate"
          render={({ field }) => (
            <FinancialDateField
              label="Fecha del aporte"
              value={field.value}
              onChange={field.onChange}
              error={form.formState.errors.movementDate?.message}
            />
          )}
        />
        <Text style={typography.bodySecondary}>Usa la misma moneda que elegiste para el objetivo.</Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
            {error}
          </Text>
        ) : null}
        {completed ? (
          <Text style={typography.cardTitle}>Meta cumplida. Ya completaste tu objetivo.</Text>
        ) : null}
        {uncertain || error ? (
          <Button
            variant="secondary"
            loading={reviewing}
            onPress={() => {
              setReviewing(true);
              void onReview()
                .then(() => setReviewed(true))
                .catch(() =>
                  setError('No pudimos actualizar el progreso. Revisa tu conexión y vuelve a consultarlo.'),
                )
                .finally(() => setReviewing(false));
            }}
          >
            Revisar progreso
          </Button>
        ) : null}
        {uncertain && reviewed && !completed ? (
          <Button
            variant="ghost"
            onPress={() => {
              setUncertain(false);
              setError('');
              setReviewed(false);
            }}
          >
            Ya revisé el progreso
          </Button>
        ) : null}
        {!completed ? (
          <Button
            loading={mutation.isPending || form.formState.isSubmitting}
            disabled={uncertain || reviewing}
            onPress={submit}
          >
            Registrar aporte
          </Button>
        ) : null}
      </Screen>
    </Modal>
  );
}
