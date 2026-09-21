import { useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Credit, CreditSimulation } from '@/features/secondary/secondary-api';
import { useSimulateCredit } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Card, Input, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';
import { spacing, typography } from '@/theme';
import { simulationSchema, simulationRequest } from './credit-schemas';
import { CreditTermsFields } from './credit-terms-fields';
import { creditMoney } from './credit-presentation';
import { CreditSimulationView } from './credit-components';
import { creditFailure } from './use-credit-submit';

export function CreditSimulationForm({ credit, onClose }: { credit: Credit; onClose(): void }) {
  const form = useForm({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      principal: credit.principal?.toString() ?? '',
      annualRate: credit.annualRate?.toString() ?? '',
      termMonths: credit.termMonths?.toString() ?? '',
      paymentDay: credit.paymentDay?.toString() ?? '',
      disbursementDate: credit.disbursementDate ?? localDateFromNative(new Date()),
      currentInstallment: '',
      today: localDateFromNative(new Date()),
      extraAmount: '',
      extraInstallment: '',
    },
  });
  const values = form.watch();
  const mutation = useSimulateCredit();
  const lock = useRef(false);
  const [result, setResult] = useState<CreditSimulation>();
  const [error, setError] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const { hidden } = usePrivacy();
  const change = (key: keyof typeof values, value: string) => {
    if (lock.current) return;
    form.setValue(key, value);
    setResult(undefined);
  };
  const submit = () => {
    if (lock.current || credit.id === undefined) return;
    lock.current = true;
    void form.handleSubmit(
      async (data) => {
        setError('');
        setResult(undefined);
        try {
          setResult(await mutation.mutateAsync({ id: credit.id!, data: simulationRequest(data) }));
        } catch (cause) {
          const failure = creditFailure(cause);
          setAdvanced(true);
          for (const key of Object.keys(simulationSchema.shape) as (keyof typeof values)[])
            if (failure.fieldErrors[key]) form.setError(key, { message: failure.fieldErrors[key] });
          setError('No pudimos simular este escenario. Revisa los datos e inténtalo de nuevo.');
        } finally {
          lock.current = false;
        }
      },
      () => {
        setAdvanced(true);
        lock.current = false;
      },
    )();
  };
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <Screen scroll keyboard style={{ gap: spacing.lg }}>
        <ScreenHeader
          title="Simular"
          subtitle="Explora escenarios antes de tomar una decisión."
          back
          onBack={() => {
            if (!lock.current) onClose();
          }}
        />
        <Text style={typography.cardTitle}>{credit.name}</Text>
        <Text style={typography.bodySecondary}>
          Esto no modifica tu crédito. El escenario parte de los datos que indiques; no incorpora
          automáticamente tus pagos reales.
        </Text>
        <Card tone="accent" style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text style={typography.cardTitle}>Datos del crédito</Text>
          <Text style={typography.body}>
            Principal · {creditMoney(Number(values.principal), credit.currency, hidden)}
          </Text>
          <Text style={typography.bodySecondary}>
            EA · {values.annualRate}% · Plazo · {values.termMonths} meses
          </Text>
        </Card>
        <Text style={typography.sectionTitle}>¿Qué pasa si abono más?</Text>
        <MoneyInput
          label="Monto adicional (opcional)"
          currency={credit.currency ?? ''}
          value={values.extraAmount}
          onChangeText={(v) => change('extraAmount', v)}
          error={form.formState.errors.extraAmount?.message}
          secureTextEntry={hidden}
          disabled={mutation.isPending}
        />
        <Input
          label="Número de cuota para el abono"
          accessibilityLabel="Número de cuota para el abono"
          keyboardType="number-pad"
          value={values.extraInstallment}
          onChangeText={(v) => change('extraInstallment', v)}
          error={form.formState.errors.extraInstallment?.message}
          disabled={mutation.isPending}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: advanced }}
          disabled={mutation.isPending}
          onPress={() => setAdvanced((value) => !value)}
          style={{ paddingVertical: spacing.md }}
        >
          <Text style={typography.cardTitle}>{advanced ? '−' : '+'} Modificar condiciones del escenario</Text>
        </Pressable>
        {advanced && (
          <View style={{ gap: spacing.lg }}>
            <CreditTermsFields
              values={values}
              onChange={change}
              errors={form.formState.errors}
              currency={credit.currency}
              busy={mutation.isPending}
              hidden={hidden}
            />
            <Input
              label="Última cuota pagada del escenario (opcional)"
              accessibilityLabel="Última cuota pagada del escenario"
              helperText="Déjalo vacío para simular desde el desembolso."
              value={values.currentInstallment}
              onChangeText={(v) => change('currentInstallment', v)}
              keyboardType="number-pad"
              error={form.formState.errors.currentInstallment?.message}
              disabled={mutation.isPending}
            />
            <FinancialDateField
              label="Fecha de referencia"
              value={values.today}
              onChange={(v) => change('today', v)}
              error={form.formState.errors.today?.message}
            />
          </View>
        )}
        {!!error && (
          <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
            {error}
          </Text>
        )}
        <Button loading={mutation.isPending} onPress={submit}>
          Simular escenario
        </Button>
        {result && <CreditSimulationView result={result} currency={credit.currency} hidden={hidden} />}
      </Screen>
    </Modal>
  );
}
