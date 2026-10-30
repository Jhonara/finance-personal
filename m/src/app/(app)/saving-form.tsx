import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { hasFormChanges, useUnsavedForm } from '@/features/forms/use-unsaved-form';
import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text } from 'react-native';
import { ApiError, toApiError } from '@/api/errors';
import { useCreateSaving, useSavings } from '@/features/secondary/use-secondary';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useFeedback } from '@/feedback/feedback-provider';
import { useTour } from '@/features/onboarding/tour-context';
import { Button, Input, MoneyInput, Screen } from '@/ui/primitives';
import { CurrencySelector } from '@/ui/currency-selector';
import { ScreenHeader } from '@/ui/headers';
import { spacing, typography } from '@/theme';
import { savingGoalSchema } from '@/features/savings/savings-schemas';
import { requestAmount } from '@/features/savings/savings-money';
import { claimSavingsEvent, type SavingsCelebration } from '@/features/savings/savings-celebrations';
import { SavingCelebration } from '@/features/savings/saving-celebration';

function SavingForm() {
  const params = useLocalSearchParams<{ suggestedName?: string }>();
  const active = useFormSessionActive();
  const form = useForm({
    defaultValues: { name: params.suggestedName ?? '', targetAmount: '' },
    resolver: zodResolver(savingGoalSchema),
  });
  const mutation = useCreateSaving();
  const goals = useSavings();
  const user = useCurrentUser();
  const feedback = useFeedback();
  const tour = useTour();
  const submitting = useRef(false);
  const [uncertain, setUncertain] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [celebration, setCelebration] = useState<SavingsCelebration>();
  const guard = useUnsavedForm({
    dirty: hasFormChanges(form.watch(), form.formState.defaultValues) || currency !== 'COP',
    busy: mutation.isPending,
    enabled: !saved,
    suspended: Boolean(celebration),
  });
  const submit = () => {
    if (submitting.current || uncertain || saved) return;
    submitting.current = true;
    void form.handleSubmit(
      async (data) => {
        const targetAmount = requestAmount(data.targetAmount);
        if (targetAmount === undefined) {
          submitting.current = false;
          return;
        }
        const first = goals.data?.length === 0;
        setError('');
        try {
          await mutation.mutateAsync({ name: data.name, targetAmount, currency });
          if (!active()) return;
          form.reset();
          setSaved(true);
          feedback.show('Meta de ahorro creada.', 'success');
          tour?.completeStep?.('add-saving');
          let celebrate = false;
          if (first && user.data?.id !== undefined)
            celebrate = await claimSavingsEvent(user.data.id, 'first-goal').catch(() => false);
          if (!active()) return;
          if (celebrate)
            setCelebration({
              title: 'Tu primera meta está lista',
              message: 'Ahora cada aporte te acercará un poco más.',
            });
          else router.back();
        } catch (cause) {
          if (!active()) return;
          const failure = cause instanceof ApiError ? cause : toApiError(cause);
          setUncertain(failure.status === null || failure.status >= 500);
          setError(
            failure.status === null || failure.status >= 500
              ? 'No pudimos confirmar la creación. Revisa tus metas antes de intentarlo de nuevo.'
              : 'No pudimos crear la meta. Revisa los datos e inténtalo de nuevo.',
          );
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
    <Screen scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Nueva meta"
        subtitle="Ponle nombre a eso que quieres lograr."
        back
        onBack={() => {
          if (!submitting.current) guard.request(() => router.back());
        }}
      />
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <Input
            label="Nombre"
            accessibilityLabel="Nombre"
            placeholder="Ej. Viaje, moto nueva, fondo de emergencia"
            helperText="Ponle un nombre que te motive."
            maxLength={100}
            value={field.value}
            onChangeText={field.onChange}
            error={form.formState.errors.name?.message}
            disabled={mutation.isPending || saved}
          />
        )}
      />
      <Controller
        control={form.control}
        name="targetAmount"
        render={({ field }) => (
          <MoneyInput
            label="Objetivo"
            placeholder="0"
            currency={currency}
            value={field.value}
            onChangeText={field.onChange}
            error={form.formState.errors.targetAmount?.message}
            disabled={mutation.isPending || saved}
          />
        )}
      />
      <CurrencySelector value={currency} onChange={setCurrency} disabled={mutation.isPending || saved} />
      <Text style={typography.bodySecondary}>
        Los aportes de esta meta estarán en {currency}. La app no convierte monedas.
      </Text>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
          {error}
        </Text>
      ) : null}
      {uncertain ? (
        <Button variant="secondary" onPress={() => guard.request(() => router.back())}>
          Ver mis metas
        </Button>
      ) : (
        <Button loading={mutation.isPending || form.formState.isSubmitting} disabled={saved} onPress={submit}>
          Crear meta
        </Button>
      )}
      <SavingCelebration
        celebration={celebration}
        onClose={() => {
          setCelebration(undefined);
          router.back();
        }}
      />
    </Screen>
  );
}

export default withFormSession(SavingForm);
