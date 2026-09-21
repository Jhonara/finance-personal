import { useState } from 'react';
import { Modal, Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Credit, CreditPayment } from '@/features/secondary/secondary-api';
import { usePayCredit } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Card, MoneyInput, Screen } from '@/ui/primitives';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ScreenHeader } from '@/ui/headers';
import { localDateFromNative } from '@/utils/local-date';
import { spacing, typography } from '@/theme';
import { paymentSchema } from './credit-schemas';
import { useCreditSubmit } from './use-credit-submit';
import { CreditAccountSelector } from './credit-account-selector';
import { creditMoney } from './credit-presentation';

export function CreditPaymentForm({
  credit,
  visible,
  onClose,
  onSaved,
  onReview,
}: {
  credit: Credit;
  visible: boolean;
  onClose(): void;
  onSaved(payment: CreditPayment): void;
  onReview(): void;
}) {
  const form = useForm({
    defaultValues: { amount: '', paymentDate: localDateFromNative(new Date()), extraPrincipalAmount: '' },
    resolver: zodResolver(paymentSchema),
  });
  const values = form.watch();
  const [account, setAccount] = useState<number>();
  const safety = useCreditSubmit();
  const mutation = usePayCredit();
  const feedback = useFeedback();
  const { hidden } = usePrivacy();
  const changed = (field: 'amount' | 'paymentDate' | 'extraPrincipalAmount', value: string) => {
    if (safety.busy) return;
    form.setValue(field, value);
    form.clearErrors(field);
    if (!safety.uncertain) {
      safety.setError('');
      mutation.reset();
    }
  };
  const close = () => {
    if (!safety.busy) {
      form.reset({ amount: '', paymentDate: localDateFromNative(new Date()), extraPrincipalAmount: '' });
      setAccount(undefined);
      mutation.reset();
      safety.reset();
      onClose();
    }
  };
  const submit = () => {
    if (credit.status === 'PAID' || credit.id === undefined) return;
    void safety.run(
      () =>
        form.handleSubmit(async (data) => {
          if (credit.disbursementDate && data.paymentDate < credit.disbursementDate) {
            form.setError('paymentDate', { message: 'La fecha debe ser igual o posterior al desembolso.' });
            return;
          }
          const payment = await mutation.mutateAsync({
            id: credit.id!,
            data: {
              amount: Number(data.amount),
              paymentDate: data.paymentDate,
              ...(data.extraPrincipalAmount === ''
                ? {}
                : { extraPrincipalAmount: Number(data.extraPrincipalAmount) }),
              ...(account === undefined ? {} : { accountId: account }),
            },
          });
          form.reset({ amount: '', paymentDate: localDateFromNative(new Date()), extraPrincipalAmount: '' });
          mutation.reset();
          setAccount(undefined);
          feedback.show('Pago registrado', 'success');
          onSaved(payment);
        })(),
      (failure) => {
        for (const key of ['amount', 'paymentDate', 'extraPrincipalAmount'] as const)
          if (failure.fieldErrors[key]) form.setError(key, { message: failure.fieldErrors[key] });
      },
    );
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <Screen scroll keyboard style={{ gap: spacing.lg }}>
        <ScreenHeader title="Registrar pago" subtitle={credit.name} back onBack={close} />
        <Card tone="info" style={{ padding: spacing.md, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Registra un pago que ya hayas realizado.</Text>
          <Text style={typography.bodySecondary}>
            Saldo pendiente · {creditMoney(credit.remainingBalance, credit.currency, hidden)}
          </Text>
        </Card>
        <MoneyInput
          label="Monto del pago"
          placeholder="0"
          currency={credit.currency ?? ''}
          value={values.amount}
          onChangeText={(v) => changed('amount', v)}
          error={form.formState.errors.amount?.message}
          disabled={safety.busy}
          secureTextEntry={hidden}
        />
        <FinancialDateField
          label="Fecha del pago"
          maximumDate={localDateFromNative(new Date())}
          value={values.paymentDate}
          onChange={(v) => {
            changed('paymentDate', v);
          }}
          error={form.formState.errors.paymentDate?.message}
        />
        <MoneyInput
          label="Del pago, cuánto va adicionalmente a capital"
          currency={credit.currency ?? ''}
          value={values.extraPrincipalAmount}
          onChangeText={(v) => changed('extraPrincipalAmount', v)}
          error={form.formState.errors.extraPrincipalAmount?.message}
          helperText="Este valor forma parte del monto total del pago."
          disabled={safety.busy}
          secureTextEntry={hidden}
        />
        {visible && (
          <CreditAccountSelector
            label="Cuenta de pago"
            currency={credit.currency}
            value={account}
            onChange={(id) => {
              setAccount(id);
              if (!safety.uncertain) {
                safety.setError('');
                mutation.reset();
              }
            }}
            disabled={safety.busy}
          />
        )}
        {!!safety.error && (
          <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
            {safety.error}
          </Text>
        )}
        {safety.uncertain && (
          <Button
            variant="secondary"
            onPress={() => {
              close();
              onReview();
            }}
          >
            Revisar crédito
          </Button>
        )}
        {credit.status === 'PAID' ? (
          <Text style={typography.cardTitle}>Esta deuda ya está completada.</Text>
        ) : (
          <Button loading={safety.busy} disabled={safety.uncertain} onPress={submit}>
            Confirmar pago
          </Button>
        )}
      </Screen>
    </Modal>
  );
}
