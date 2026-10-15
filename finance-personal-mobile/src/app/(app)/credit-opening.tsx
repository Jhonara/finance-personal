import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCredit, useSetCreditOpeningPosition } from '@/features/secondary/use-secondary';
import { useCreditAmortization } from '@/features/credits/use-amortization';
import { openingPositionSchema } from '@/features/credits/credit-schemas';
import { useCreditSubmit } from '@/features/credits/use-credit-submit';
import { creditMoney } from '@/features/credits/credit-presentation';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatLocalDate, localDateFromNative } from '@/utils/local-date';
import { colors, spacing, typography } from '@/theme';
import { Button, Card, Input, MoneyInput, Screen } from '@/ui/primitives';
import { FinancialDateField } from '@/ui/financial-date-field';
import { ScreenHeader } from '@/ui/headers';
import { ErrorState, Skeleton } from '@/ui/states';

export default function CreditOpeningScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const creditId = Number(id);
  const credit = useCredit(creditId);
  const history = useCreditAmortization(creditId);
  const mutation = useSetCreditOpeningPosition();
  const safety = useCreditSubmit();
  const feedback = useFeedback();
  const { hidden } = usePrivacy();
  const [values, setValues] = useState({
    balance: '',
    date: localDateFromNative(new Date()),
    remainingMonths: '',
    nextPaymentDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!credit.data) return;
    setValues({
      balance: String(credit.data.openingBalance ?? ''),
      date: credit.data.openingDate ?? localDateFromNative(new Date()),
      remainingMonths: String(credit.data.openingRemainingMonths ?? ''),
      nextPaymentDate: credit.data.openingNextPaymentDate ?? '',
    });
  }, [credit.data?.id]);
  const lastPayment = history.data?.payments.reduce<string | undefined>(
    (latest, payment) => (payment.date && (!latest || payment.date > latest) ? payment.date : latest),
    undefined,
  );
  const change = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };
  const submit = () => {
    const current = credit.data;
    if (current?.version === undefined || safety.busy || safety.uncertain) return;
    const parsed = openingPositionSchema.safeParse(values);
    const fieldErrors: Record<string, string> = {};
    if (!parsed.success)
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    if (Number(values.balance) > Number(current.principal))
      fieldErrors.balance = 'El saldo no puede superar lo que te prestaron.';
    if (Number(values.remainingMonths) > Number(current.termMonths))
      fieldErrors.remainingMonths = 'Las cuotas pendientes no pueden superar el plazo original.';
    if (values.date < (current.disbursementDate ?? ''))
      fieldErrors.date = 'El extracto debe ser posterior al desembolso.';
    if (lastPayment && values.date < lastPayment)
      fieldErrors.date = `Usa un extracto del ${formatLocalDate(lastPayment)} o posterior para incluir los pagos ya anotados.`;
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    void safety.run(
      async () => {
        await mutation.mutateAsync({
          id: creditId,
          data: {
            version: current.version!,
            openingBalance: Number(values.balance),
            openingDate: values.date,
            openingRemainingMonths: Number(values.remainingMonths),
            openingNextPaymentDate: values.nextPaymentDate,
          },
        });
        feedback.show('Saldo del crédito actualizado', 'success');
        router.back();
      },
      (failure) => safety.setError(failure.message || 'Revisa los datos del extracto e inténtalo de nuevo.'),
    );
  };
  return (
    <Screen entry scroll keyboard style={{ gap: spacing.lg }}>
      <ScreenHeader
        title="Actualizar desde extracto"
        subtitle={credit.data?.name ?? 'Crédito'}
        back
        onBack={() => router.back()}
      />
      {credit.isPending ? (
        <Skeleton height={180} />
      ) : !credit.data ? (
        <ErrorState onRetry={() => void credit.refetch()} />
      ) : (
        <>
          <Card tone="info" style={{ gap: spacing.sm }}>
            <Ionicons name="document-text-outline" size={25} color={colors.primary} />
            <Text style={typography.cardTitle}>Pon tu crédito al día en la app</Text>
            <Text style={typography.bodySecondary}>
              Copia el capital que aún debes y la fecha de tu extracto. Los pagos anteriores a esa fecha
              quedan incluidos en ese saldo; los que ya anotaste siguen en el historial y no se descuentan dos
              veces.
            </Text>
            <Text style={typography.caption}>
              Saldo registrado ahora:{' '}
              {creditMoney(credit.data.remainingBalance, credit.data.currency, hidden)}. Consulta el capital
              exacto con tu entidad; no incluyas intereses futuros, seguros ni mora.
            </Text>
          </Card>
          {lastPayment ? (
            <Text style={typography.bodySecondary}>
              Último pago anotado: {formatLocalDate(lastPayment)}. Usa un extracto de ese día o posterior.
            </Text>
          ) : null}
          <MoneyInput
            label="Capital pendiente según extracto"
            helperText="Solo el capital que falta por pagar."
            currency={credit.data.currency ?? ''}
            value={values.balance}
            onChangeText={(v) => change('balance', v)}
            error={errors.balance}
            disabled={safety.busy}
            secureTextEntry={hidden}
          />
          <View pointerEvents={safety.busy ? 'none' : 'auto'}>
            <FinancialDateField
              label="Fecha de corte del extracto"
              value={values.date}
              onChange={(v) => change('date', v)}
              error={errors.date}
              maximumDate={localDateFromNative(new Date())}
            />
          </View>
          <Input
            label="Cuotas que faltan"
            accessibilityLabel="Cuotas que faltan"
            helperText="Cantidad de cuotas pendientes según tu entidad."
            keyboardType="number-pad"
            value={values.remainingMonths}
            onChangeText={(v) => change('remainingMonths', v)}
            error={errors.remainingMonths}
            disabled={safety.busy}
          />
          <View pointerEvents={safety.busy ? 'none' : 'auto'}>
            <FinancialDateField
              label="Próxima cuota según extracto"
              value={values.nextPaymentDate}
              onChange={(v) => change('nextPaymentDate', v)}
              error={errors.nextPaymentDate}
            />
          </View>
          <Text style={typography.caption}>
            El estado «al día» supone que no había cuotas anteriores pendientes en la fecha del extracto. Si
            tu entidad muestra mora, este resumen no la incluye.
          </Text>
          {safety.error ? (
            <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
              {safety.error}
            </Text>
          ) : null}
          <Button loading={safety.busy} disabled={safety.uncertain} onPress={submit}>
            Guardar saldo del extracto
          </Button>
          {safety.uncertain ? (
            <Button
              variant="secondary"
              onPress={() => {
                void credit.refetch().then((result) => {
                  if (result.isSuccess) router.back();
                });
              }}
            >
              Consultar crédito actualizado
            </Button>
          ) : null}
        </>
      )}
    </Screen>
  );
}
