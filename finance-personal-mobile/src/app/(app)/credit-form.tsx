import { withFormSession, useFormSessionActive } from '@/features/forms/form-session';
import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCredit } from '@/features/secondary/use-secondary';
import { createCreditSchema, termsRequest } from '@/features/credits/credit-schemas';
import { CreditTermsFields } from '@/features/credits/credit-terms-fields';
import { CreditAccountSelector } from '@/features/credits/credit-account-selector';
import { useCreditSubmit } from '@/features/credits/use-credit-submit';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Input, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { localDateFromNative } from '@/utils/local-date';
import { spacing, typography } from '@/theme';

function CreditForm() {
  const active = useFormSessionActive();
  const form = useForm({
    defaultValues: {
      name: '',
      principal: '',
      annualRate: '',
      termMonths: '',
      paymentDay: '',
      disbursementDate: localDateFromNative(new Date()),
      currency: 'COP',
    },
    resolver: zodResolver(createCreditSchema),
  });
  const values = form.watch();
  const [account, setAccount] = useState<number>();
  const [saved, setSaved] = useState(false);
  const mutation = useCreateCredit();
  const safety = useCreditSubmit();
  const feedback = useFeedback();
  const { hidden } = usePrivacy();
  const submit = () => {
    if (saved) return;
    void safety.run(
      () =>
        form.handleSubmit(async (data) => {
          await mutation.mutateAsync({
            ...termsRequest(data),
            name: data.name,
            currency: data.currency,
            ...(account === undefined ? {} : { disbursementAccountId: account }),
          });
          if (!active()) return;
          form.reset();
          setAccount(undefined);
          setSaved(true);
          feedback.show('Crédito registrado', 'success');
          router.back();
        })(),
      (failure) => {
        for (const key of Object.keys(createCreditSchema.shape) as (keyof typeof values)[])
          if (failure.fieldErrors[key]) form.setError(key, { message: failure.fieldErrors[key] });
      },
    );
  };
  return (
    <Screen scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Nuevo crédito"
        subtitle="Registra una deuda para poder seguirla."
        back
        onBack={() => {
          if (!safety.busy) router.back();
        }}
      />
      <Input
        label="Nombre del crédito"
        accessibilityLabel="Nombre del crédito"
        value={values.name}
        onChangeText={(v) => form.setValue('name', v)}
        error={form.formState.errors.name?.message}
        disabled={safety.busy || saved}
      />
      <Input
        label="Moneda"
        accessibilityLabel="Moneda"
        autoCapitalize="characters"
        maxLength={3}
        value={values.currency}
        onChangeText={(v) => {
          form.setValue('currency', v.toUpperCase());
          setAccount(undefined);
        }}
        error={form.formState.errors.currency?.message}
        disabled={safety.busy || saved}
      />
      <CreditTermsFields
        values={values}
        onChange={(key, value) => form.setValue(key, value)}
        errors={form.formState.errors}
        currency={values.currency}
        hidden={hidden}
        busy={safety.busy || saved}
      />
      <CreditAccountSelector
        label="Cuenta de desembolso"
        currency={values.currency}
        value={account}
        onChange={setAccount}
        disabled={safety.busy || saved}
      />
      {!!safety.error && (
        <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
          {safety.error}
        </Text>
      )}
      {safety.uncertain && (
        <Button variant="secondary" onPress={() => router.back()}>
          Revisar créditos
        </Button>
      )}
      <Button onPress={submit} loading={safety.busy} disabled={safety.uncertain || saved}>
        Registrar crédito
      </Button>
    </Screen>
  );
}

export default withFormSession(CreditForm);
