import { MotionModal as Modal } from '@/ui/motion-modal';
import { MotionPressable } from '@/ui/motion';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Credit, CreditSimulation } from '@/features/secondary/secondary-api';
import { useSimulateCredit } from '@/features/secondary/use-secondary';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Card, Input, MoneyInput, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';
import { colors, radius, spacing, typography } from '@/theme';
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
        <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={styles.hero}>
          <View style={styles.heroHeading}>
            <Ionicons name="analytics-outline" size={24} color={colors.mint} />
            <Text style={styles.heroEyebrow}>PROYECCIÓN · {credit.currency ?? 'MONEDA'}</Text>
          </View>
          <Text style={styles.heroTitle}>{credit.name ?? 'Tu crédito'}</Text>
          <Text style={styles.heroAmount} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1}>
            {creditMoney(values.principal || undefined, credit.currency, hidden)}
          </Text>
          <Text style={styles.heroCaption}>
            Capital de partida · EA {values.annualRate || '—'}% · {values.termMonths || '—'} meses
          </Text>
        </LinearGradient>
        <Text style={typography.caption}>
          Simulación libre: prueba otras condiciones del préstamo sin cambiarlas en tu crédito. Para varios
          abonos desde lo que debes hoy, usa Ver amortización.
        </Text>
        <Card style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="trending-down-outline" size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.sectionTitle}>¿Y si haces un abono?</Text>
              <Text style={typography.bodySecondary}>
                Prueba un monto extra y elige en qué cuota aplicarlo.
              </Text>
            </View>
          </View>
          <MoneyInput
            label="Monto adicional (opcional)"
            helperText="Dinero extra además de la cuota normal. Déjalo vacío para ver el plan sin abonos."
            placeholder="0"
            currency={credit.currency ?? ''}
            value={values.extraAmount}
            onChangeText={(v) => change('extraAmount', v)}
            error={form.formState.errors.extraAmount?.message}
            secureTextEntry={hidden}
            disabled={mutation.isPending}
          />
          <Input
            label="Número de cuota para el abono"
            placeholder="Ej. 3"
            accessibilityLabel="Número de cuota para el abono"
            keyboardType="number-pad"
            value={values.extraInstallment}
            onChangeText={(v) => change('extraInstallment', v)}
            error={form.formState.errors.extraInstallment?.message}
            disabled={mutation.isPending}
          />
          <Text style={typography.caption}>Esta prueba no modifica tu crédito ni registra un pago.</Text>
        </Card>
        <MotionPressable
          accessibilityRole="button"
          accessibilityState={{ expanded: advanced }}
          disabled={mutation.isPending}
          onPress={() => setAdvanced((value) => !value)}
          style={styles.advanced}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          <Text style={[typography.label, { flex: 1 }]}>
            {advanced ? '−' : '+'} Modificar condiciones del escenario
          </Text>
          <Ionicons name={advanced ? 'chevron-up' : 'chevron-down'} size={19} color={colors.primary} />
        </MotionPressable>
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

const styles = StyleSheet.create({
  hero: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.large },
  heroHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroEyebrow: { ...typography.caption, color: colors.mint, fontWeight: '700', letterSpacing: 0.4 },
  heroTitle: { ...typography.cardTitle, color: colors.surface },
  heroAmount: { ...typography.moneyLarge, color: colors.surface },
  heroCaption: { ...typography.caption, color: '#C3E5E4' },
  section: { gap: spacing.lg, padding: spacing.lg },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanced: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.medium,
    backgroundColor: colors.infoSoft,
  },
});
