import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCredit } from '@/features/secondary/use-secondary';
import { useAmortizationScenario, useCreditAmortization } from '@/features/credits/use-amortization';
import type { CreditAmortizationScenario } from '@/features/credits/amortization-api';
import { AmortizationSchedule, RecordedPayments } from '@/features/credits/amortization-components';
import { creditFailure } from '@/features/credits/use-credit-submit';
import { creditMoney } from '@/features/credits/credit-presentation';
import { usePrivacy } from '@/privacy/privacy-provider';
import { requestAmount } from '@/utils/decimal-money';
import { formatLocalDate } from '@/utils/local-date';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { Button, Card, SelectField, MoneyInput, Screen } from '@/ui/primitives';
import { ModalSelector } from '@/ui/modal-selector';
import { BrandMascot } from '@/ui/brand-media';
import { Progress } from '@/ui/progress';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { ErrorState, Skeleton } from '@/ui/states';
import { colors, radius, shadows, spacing, typography } from '@/theme';

type ScheduleMode = 'current' | 'original' | 'scenario';

export default function CreditAmortizationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreditAmortizationContent key={id} id={Number(id)} />;
}

function CreditAmortizationContent({ id }: { id: number }) {
  const credit = useCredit(id);
  const overview = useCreditAmortization(id);
  const simulate = useAmortizationScenario();
  const { hidden } = usePrivacy();
  const busy = useRef(false);
  const [installment, setInstallment] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [contributions, setContributions] = useState<Array<{ installment: number; amount: number }>>([]);
  const [scenario, setScenario] = useState<CreditAmortizationScenario>();
  const [mode, setMode] = useState<ScheduleMode>('current');
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [strategy, setStrategy] = useState<'REDUCE_TERM' | 'REDUCE_PAYMENT'>('REDUCE_TERM');
  const revision = useRef(0);

  useEffect(() => {
    if (!overview.data) return;
    revision.current++;
    setInstallment(
      String(
        overview.data.projectedSchedule.find((row) => (row.endingBalance ?? 0) > 0)?.installment ??
          overview.data.nextInstallment,
      ),
    );
    setScenario(undefined);
    setMode('current');
  }, [overview.dataUpdatedAt, overview.data]);

  const changeInstallment = (value: string) => {
    revision.current++;
    setInstallment(value);
    const planned = contributions.find((item) => item.installment === Number(value));
    setExtraAmount(planned ? String(planned.amount) : '');
    setScenario(undefined);
    setError('');
    setMode('current');
  };
  const changeAmount = (value: string) => {
    revision.current++;
    setExtraAmount(value);
    setScenario(undefined);
    setError('');
    setMode('current');
  };
  const submit = async () => {
    const data = overview.data;
    if (!data || busy.current) return;
    const target = Number(installment);
    const amount = requestAmount(extraAmount);
    if (
      extraAmount &&
      (amount === undefined ||
        !data.projectedSchedule.some((row) => row.installment === target && (row.endingBalance ?? 0) > 0))
    ) {
      setError('Elige una cuota disponible y escribe un abono mayor que cero.');
      return;
    }
    const plan =
      extraAmount && amount !== undefined
        ? [...contributions.filter((item) => item.installment !== target), { installment: target, amount }]
        : contributions;
    if (!plan.length) {
      setError('Añade al menos un abono para calcular el escenario.');
      return;
    }
    busy.current = true;
    const requestedRevision = revision.current;
    setError('');
    setScenario(undefined);
    try {
      const result = await simulate.mutateAsync({ id, contributions: plan, strategy });
      if (revision.current !== requestedRevision) return;
      setScenario(result);
      setContributions(plan.sort((a, b) => a.installment - b.installment));
      setExtraAmount(String(plan.find((item) => item.installment === target)?.amount ?? ''));
      setMode('scenario');
    } catch (cause) {
      if (revision.current !== requestedRevision) return;
      const failure = creditFailure(cause);
      setError(
        failure.status === 400 && failure.message
          ? failure.message
          : 'No pudimos calcular este escenario. Inténtalo de nuevo.',
      );
    } finally {
      busy.current = false;
    }
  };

  const refresh = () => {
    revision.current++;
    setScenario(undefined);
    setError('');
    void Promise.all([credit.refetch(), overview.refetch()]);
  };
  const data = overview.data;
  const currency = data?.currency ?? credit.data?.currency ?? '';
  const chosenRow = data?.projectedSchedule.find((row) => row.installment === Number(installment));
  const addContribution = () => {
    const amount = requestAmount(extraAmount);
    if (amount === undefined || !chosenRow || !(chosenRow.endingBalance! > 0)) {
      setError('Elige una cuota y escribe un abono mayor que cero.');
      return;
    }
    setContributions((current) =>
      [
        ...current.filter((item) => item.installment !== Number(installment)),
        { installment: Number(installment), amount },
      ].sort((a, b) => a.installment - b.installment),
    );
    changeAmount(String(amount));
  };
  const rows =
    mode === 'scenario' && scenario
      ? scenario.schedule
      : mode === 'original'
        ? (data?.originalSchedule ?? [])
        : (data?.projectedSchedule ?? []);

  return (
    <Screen scroll keyboard style={styles.screen} refreshing={overview.isRefetching} onRefresh={refresh}>
      <ScreenHeader
        title="Amortización"
        subtitle={credit.data?.name ?? 'Detalle de tu crédito'}
        back
        onBack={() => router.back()}
      />
      {!Number.isSafeInteger(id) || id <= 0 ? (
        <ErrorState />
      ) : overview.isPending ? (
        <Skeleton height={240} />
      ) : !data ? (
        <ErrorState onRetry={() => void overview.refetch()} />
      ) : (
        <>
          {overview.isError ? (
            <Text style={typography.caption}>
              No pudimos actualizar. Estos son los últimos datos disponibles.
            </Text>
          ) : null}
          <LinearGradient colors={[colors.heroStart, colors.heroEnd]} style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name="layers-outline" size={24} color={colors.mint} />
              </View>
              <Text style={styles.heroEyebrow}>SALDO REAL · {currency}</Text>
            </View>
            <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
              {creditMoney(data.currentBalance, currency, hidden)}
            </Text>
            <Text style={styles.heroHint}>
              Monto original: {creditMoney(data.principal, currency, hidden)}. El saldo incluye tus pagos
              contabilizados.
            </Text>
            <View style={styles.heroFacts}>
              <View style={styles.heroFact}>
                <Text style={styles.factLabel}>Desembolsado</Text>
                <Text style={styles.factValue}>{formatLocalDate(data.disbursementDate, 'compact')}</Text>
              </View>
              <View style={styles.heroFact}>
                <Text style={styles.factLabel}>Cuota base estimada</Text>
                <Text style={styles.factValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {creditMoney(data.contractualInstallment, currency, hidden)}
                </Text>
              </View>
            </View>
          </LinearGradient>
          {credit.data?.openingDate ? (
            <Card style={styles.terms}>
              <Text style={typography.cardTitle}>Tu punto de partida</Text>
              <Text style={typography.bodySecondary}>
                Saldo de {creditMoney(credit.data.openingBalance, currency, hidden)} al{' '}
                {formatLocalDate(credit.data.openingDate, 'compact')}, con{' '}
                {credit.data.openingRemainingMonths} cuotas por delante según tu extracto.
              </Text>
              <Text style={typography.caption}>
                Los pagos anteriores al corte están incluidos en ese saldo. Aquí solo se muestra el historial
                registrado desde entonces.
              </Text>
            </Card>
          ) : null}

          <SectionHeader title="Desde tu saldo actual" />
          {data.currentBalance === 0 ? (
            <Card style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={27} color={colors.success} />
              <View style={styles.grow}>
                <Text style={typography.cardTitle}>Crédito pagado</Text>
                <Text style={typography.bodySecondary}>
                  Consulta abajo el plan original y tus pagos reales.
                </Text>
              </View>
            </Card>
          ) : data.projectionWarning ? (
            <Card style={styles.warningCard}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
              <Text style={[typography.bodySecondary, styles.grow]}>{data.projectionWarning}</Text>
            </Card>
          ) : (
            <>
              {credit.data?.status === 'LATE' ? (
                <Card style={styles.warningCard}>
                  <Ionicons name="alert-circle-outline" size={24} color={colors.warning} />
                  <Text style={[typography.bodySecondary, styles.grow]}>
                    Este crédito figura atrasado. La proyección parte del saldo registrado y no incluye
                    posibles intereses de mora o cargos de tu entidad.
                  </Text>
                </Card>
              ) : null}
              {data.projectedSchedule.some((row) => (row.endingBalance ?? 0) > 0) ? (
                <Card style={styles.scenarioForm}>
                  <View style={styles.formHeading}>
                    <BrandMascot size={48} />
                    <View style={styles.grow}>
                      <Text accessibilityRole="header" style={typography.sectionTitle}>
                        Simula tus abonos extra
                      </Text>
                      <Text style={typography.bodySecondary}>
                        Prueba uno o varios pagos extra y compara cuánto podrías ahorrar. Tu deuda real no
                        cambia.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tabs}>
                    {(['REDUCE_TERM', 'REDUCE_PAYMENT'] as const).map((option) => (
                      <MotionPressable
                        key={option}
                        accessibilityRole="radio"
                        accessibilityLabel={
                          option === 'REDUCE_TERM' ? 'Reducir plazo' : 'Reducir cuota mensual'
                        }
                        accessibilityState={{ checked: strategy === option, disabled: simulate.isPending }}
                        disabled={simulate.isPending}
                        onPress={() => {
                          setStrategy(option);
                          changeAmount(extraAmount);
                        }}
                        style={[styles.tab, strategy === option && styles.tabSelected]}
                      >
                        <Ionicons
                          name={option === 'REDUCE_TERM' ? 'hourglass-outline' : 'wallet-outline'}
                          size={20}
                          color={strategy === option ? colors.mint : colors.primary}
                        />
                        <Text style={[styles.tabText, strategy === option && styles.tabTextSelected]}>
                          {option === 'REDUCE_TERM' ? 'Terminar antes' : 'Bajar la cuota'}
                        </Text>
                      </MotionPressable>
                    ))}
                  </View>
                  <Text style={typography.caption}>
                    {strategy === 'REDUCE_TERM'
                      ? 'Terminar antes: sigues pagando la misma cuota mensual y acabas en menos tiempo.'
                      : 'Bajar la cuota: pagas menos cada mes después de cada abono y mantienes el plazo, salvo que saldes toda la deuda.'}
                  </Text>
                  <MoneyInput
                    label="Abono extra a capital"
                    helperText="Dinero adicional a tu cuota normal. Se usa para reducir lo que debes."
                    currency={currency}
                    value={extraAmount}
                    onChangeText={changeAmount}
                    placeholder="0"
                    secureTextEntry={hidden}
                    disabled={simulate.isPending}
                  />
                  <SelectField
                    label="¿En qué cuota harías el abono?"
                    disabled={simulate.isPending}
                    value={
                      chosenRow
                        ? `Cuota ${chosenRow.installment} · ${formatLocalDate(chosenRow.date, 'compact')}`
                        : 'Elige una cuota'
                    }
                    onPress={() => {
                      if (!simulate.isPending) setSelecting(true);
                    }}
                  />
                  <Text style={typography.caption}>
                    Saldo que quedaría después de esa cuota, sin estos abonos extra:{' '}
                    {creditMoney(chosenRow?.endingBalance, currency, hidden)}
                  </Text>
                  <Button variant="secondary" disabled={simulate.isPending} onPress={addContribution}>
                    {contributions.some((item) => item.installment === Number(installment))
                      ? 'Actualizar abono de esta cuota'
                      : 'Añadir abono al escenario'}
                  </Button>
                  {contributions.length ? (
                    <View style={{ gap: spacing.md }}>
                      <Text style={typography.cardTitle}>
                        Abonos de esta simulación · {contributions.length}
                      </Text>
                      {contributions.map((item) => (
                        <View key={item.installment} style={styles.plannedContribution}>
                          <Text style={typography.label}>
                            Cuota {item.installment} · {creditMoney(item.amount, currency, hidden)}
                          </Text>
                          <View style={styles.contributionActions}>
                            <Button
                              variant="ghost"
                              disabled={simulate.isPending}
                              accessibilityLabel={`Editar abono cuota ${item.installment}`}
                              onPress={() => {
                                changeInstallment(String(item.installment));
                                changeAmount(String(item.amount));
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={simulate.isPending}
                              accessibilityLabel={`Quitar abono cuota ${item.installment}`}
                              onPress={() => {
                                setContributions((current) =>
                                  current.filter((entry) => entry.installment !== item.installment),
                                );
                                changeAmount('');
                              }}
                            >
                              Quitar
                            </Button>
                          </View>
                        </View>
                      ))}
                      <Text style={typography.caption}>
                        Añade otro eligiendo una cuota distinta. Editar cambia el importe; Quitar lo saca de
                        esta simulación.
                      </Text>
                    </View>
                  ) : null}
                  <Text style={typography.caption}>
                    Elige cuota e importe, añade los abonos que quieras y pulsa Calcular impacto. También se
                    incluye el importe que tengas escrito arriba.
                  </Text>
                  {contributions.length > 0 && !scenario ? (
                    <Text accessibilityLiveRegion="polite" style={typography.caption}>
                      Falta calcular: la lista de cuotas todavía no incluye estos cambios.
                    </Text>
                  ) : null}
                  {error ? (
                    <Text accessibilityLiveRegion="polite" style={styles.error}>
                      {error}
                    </Text>
                  ) : null}
                  <Button loading={simulate.isPending} onPress={() => void submit()}>
                    Calcular impacto
                  </Button>
                  <Text style={typography.caption}>
                    No registra ni programa pagos. Esta prueba no se guarda al salir. Para un pago que ya
                    hiciste, usa Registrar pago en el crédito.
                  </Text>
                </Card>
              ) : (
                <Card style={styles.successCard}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
                  <Text style={[typography.bodySecondary, styles.grow]}>
                    Solo queda la cuota final. No hay otra cuota que adelantar con un abono en este plan.
                  </Text>
                </Card>
              )}
              {scenario ? (
                <MotionEntry revision={scenario}>
                  <Card style={styles.impactCard}>
                    <Text style={styles.impactEyebrow}>
                      {scenario.contributions?.length ?? 1} ABONOS SIMULADOS
                    </Text>
                    <Text style={styles.impactBody}>
                      Total de abonos extra: {creditMoney(scenario.extraAmount, currency, hidden)}
                    </Text>
                    <Text accessibilityRole="header" style={styles.impactTitle}>
                      {scenario.strategy === 'REDUCE_PAYMENT' && scenario.monthlyPaymentAfterExtra > 0
                        ? 'Una cuota más liviana'
                        : scenario.savedInstallments > 0
                          ? `${scenario.savedInstallments} ${scenario.savedInstallments === 1 ? 'cuota menos' : 'cuotas menos'}`
                          : 'El plazo se mantiene'}
                    </Text>
                    <View style={styles.impactDates}>
                      <Fact
                        label="Intereses sin abonos extra"
                        value={creditMoney(scenario.baselineRemainingInterest, currency, hidden)}
                        dark
                      />
                      <Fact
                        label="Intereses con tus abonos"
                        value={creditMoney(scenario.scenarioRemainingInterest, currency, hidden)}
                        dark
                      />
                    </View>
                    <Progress
                      value={
                        (100 * scenario.scenarioRemainingInstallments) /
                        Math.max(1, scenario.baselineRemainingInstallments)
                      }
                      color={colors.mint}
                      label={`${scenario.scenarioRemainingInstallments} cuotas frente a ${scenario.baselineRemainingInstallments}`}
                    />
                    <Text style={styles.impactBody}>
                      {scenario.scenarioRemainingInstallments} cuotas con tus abonos ·{' '}
                      {scenario.baselineRemainingInstallments} sin abonos extra
                    </Text>
                    {scenario.strategy === 'REDUCE_PAYMENT' ? (
                      <Fact
                        label="Cuota estimada después del último abono"
                        value={creditMoney(scenario.monthlyPaymentAfterExtra, currency, hidden)}
                        dark
                      />
                    ) : null}
                    <Text style={styles.impactBody}>
                      Intereses estimados que evitarías:{' '}
                      {creditMoney(scenario.interestSaved, currency, hidden)}
                    </Text>
                    <View style={styles.impactDates}>
                      <Fact
                        label="Terminarías sin abonos extra"
                        value={formatLocalDate(scenario.baselinePayoffDate, 'compact')}
                        dark
                      />
                      <Fact
                        label="Terminarías con tus abonos"
                        value={formatLocalDate(scenario.scenarioPayoffDate, 'compact')}
                        dark
                      />
                    </View>
                    <Text style={styles.impactNote}>
                      Compara el mismo saldo y tasa con y sin tus abonos. Son estimaciones, no cambios en tu
                      contrato.
                      {scenario.strategy === 'REDUCE_PAYMENT'
                        ? ' La cuota baja después de cada abono; el valor mostrado corresponde al último. Mira cada pago en Con abonos.'
                        : ' Mira las nuevas fechas y saldos en Con abonos.'}
                    </Text>
                  </Card>
                </MotionEntry>
              ) : null}
              <Card style={styles.forecastCard}>
                <View style={styles.forecastTitle}>
                  <Ionicons name="calendar-outline" size={22} color={colors.credit} />
                  <Text style={typography.cardTitle}>Sin nuevos abonos extra</Text>
                </View>
                <Text style={typography.caption}>
                  Este es el punto de comparación: sigues pagando tu cuota mensual desde el saldo actual.
                </Text>
                <View style={styles.forecastStats}>
                  <Fact label="Cuotas por delante" value={String(data.projectedSchedule.length)} />
                  <Fact
                    label="Último pago estimado"
                    value={formatLocalDate(data.projectedPayoffDate, 'compact')}
                  />
                  <Fact
                    label="Intereses por delante"
                    value={creditMoney(data.projectedRemainingInterest, currency, hidden)}
                  />
                </View>
              </Card>
            </>
          )}
          <ModalSelector
            visible={selecting}
            label="Elige la cuota del abono"
            subtitle="Fechas de la proyección desde tu saldo actual."
            selectedId={Number(installment)}
            onClose={() => setSelecting(false)}
            onSelect={(value) => changeInstallment(String(value))}
            options={data.projectedSchedule
              .filter((row) => (row.endingBalance ?? 0) > 0)
              .map((row) => ({
                id: row.installment!,
                label: `Cuota ${row.installment} · ${formatLocalDate(row.date, 'compact')}`,
                subtitle: `Capital disponible: ${creditMoney(row.endingBalance, currency, hidden)}`,
                icon: 'calendar-outline',
                tone: 'success',
              }))}
          />

          <SectionHeader title="Detalle de cuotas" />
          <View style={styles.tabs}>
            <Tab label="Actual" selected={mode === 'current'} onPress={() => setMode('current')} />
            <Tab label="Original" selected={mode === 'original'} onPress={() => setMode('original')} />
            {scenario ? (
              <Tab label="Con abonos" selected={mode === 'scenario'} onPress={() => setMode('scenario')} />
            ) : null}
          </View>
          <Text style={typography.bodySecondary}>
            {mode === 'original'
              ? 'Original: así era el plan al recibir el préstamo. No indica pagos hechos ni deudas vencidas.'
              : mode === 'scenario'
                ? 'Con abonos: así quedaría el plan si haces todos los pagos extra de esta simulación.'
                : 'Actual: parte de lo que debes según tus datos registrados, sin incluir los abonos de esta simulación.'}
          </Text>
          <Text style={typography.caption}>
            Saldo inicial y final: deuda antes y después de esa cuota. Interés: costo del préstamo en ese mes.
            A capital: parte de la cuota normal que reduce la deuda. El abono extra aparece aparte.
            {mode === 'current' ? ' Toca + en una cuota para elegirla en el simulador de arriba.' : ''}
          </Text>
          {rows.length ? (
            <AmortizationSchedule
              key={mode}
              rows={rows}
              currency={currency}
              hidden={hidden}
              selectedInstallment={mode === 'current' ? Number(installment) : undefined}
              onSelect={
                mode === 'current' && data.currentBalance > 0
                  ? (selected) => changeInstallment(String(selected))
                  : undefined
              }
            />
          ) : (
            <Card style={styles.emptySchedule}>
              <Text style={typography.bodySecondary}>
                {mode === 'current' && data.currentBalance === 0
                  ? 'Ya no quedan cuotas pendientes.'
                  : 'No hay cuotas disponibles para esta vista.'}
              </Text>
            </Card>
          )}
          <Card style={styles.terms}>
            <View style={styles.termsHeading}>
              <Ionicons name="information-circle-outline" size={21} color={colors.credit} />
              <Text style={typography.cardTitle}>Así comenzó el crédito</Text>
            </View>
            <View style={styles.termsGrid}>
              <Fact label="Monto inicial" value={creditMoney(data.principal, currency, hidden)} />
              <Fact label="Plazo pactado" value={`${data.termMonths} cuotas`} />
              <Fact label="Tasa EA" value={`${data.annualRate}%`} />
              <Fact
                label="Tasa mensual efectiva"
                value={`${data.monthlyRatePercent.toLocaleString('es-CO', { maximumFractionDigits: 4 })}%`}
              />
            </View>
            <Text style={typography.caption}>
              La proyección calcula interés mensual efectivo. No incluye seguros, cargos ni interés diario del
              banco.
            </Text>
            <Text style={typography.caption}>
              La numeración sigue el calendario desde el desembolso; no indica cuántas cuotas has pagado. La
              cuota base se calcula con el monto, la tasa y el plazo registrados.
            </Text>
          </Card>

          <SectionHeader title="Pagos que ya hiciste" />
          <Text style={typography.bodySecondary}>
            {data.payments.length}{' '}
            {data.payments.length === 1 ? 'pago contabilizado' : 'pagos contabilizados'}. Los pagos revertidos
            no aparecen aquí.
          </Text>
          <RecordedPayments payments={data.payments} currency={currency} hidden={hidden} />
          {data.recordedExtraTotal > 0 ? (
            <Card style={styles.recordedImpact}>
              <View style={styles.termsHeading}>
                <Ionicons name="sparkles-outline" size={21} color={colors.success} />
                <Text style={typography.cardTitle}>Tus abonos extra ya cuentan</Text>
              </View>
              <Text style={typography.bodySecondary}>
                Has aportado {creditMoney(data.recordedExtraTotal, currency, hidden)} directamente a capital.
              </Text>
              {typeof data.installmentsSavedByRecordedExtras === 'number' &&
              typeof data.interestSavedByRecordedExtras === 'number' ? (
                <View style={styles.recordedStats}>
                  <Fact
                    label="Cuotas estimadas que evitaste"
                    value={String(data.installmentsSavedByRecordedExtras)}
                  />
                  <Fact
                    label="Interés futuro estimado evitado"
                    value={creditMoney(data.interestSavedByRecordedExtras, currency, hidden)}
                  />
                </View>
              ) : null}
              <Text style={typography.caption}>
                Estimación frente al mismo historial sin esos abonos extra, manteniendo la cuota pactada.
              </Text>
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Fact({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <View style={styles.fact}>
      <Text style={[typography.caption, dark && styles.darkLabel]}>{label}</Text>
      <Text numberOfLines={2} style={[typography.label, dark && styles.darkValue]}>
        {value}
      </Text>
    </View>
  );
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <MotionPressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`Ver ${label.toLowerCase()} de amortización`}
      onPress={onPress}
      style={[styles.tab, selected && styles.tabSelected]}
    >
      <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  grow: { flex: 1, minWidth: 0 },
  hero: { gap: spacing.md, borderRadius: 26, padding: spacing.xl, ...shadows.card },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF1E',
  },
  heroEyebrow: { ...typography.caption, color: '#B9E9E3', fontWeight: '700', letterSpacing: 0.5 },
  heroAmount: { ...typography.moneyLarge, color: colors.surface },
  heroHint: { ...typography.caption, color: '#C3E5E4' },
  heroFacts: { flexDirection: 'row', gap: spacing.sm },
  heroFact: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    borderRadius: radius.medium,
    backgroundColor: '#FFFFFF1C',
    padding: spacing.md,
  },
  factLabel: { ...typography.caption, color: '#C3E5E4' },
  factValue: { ...typography.label, color: colors.surface },
  terms: { gap: spacing.md, padding: spacing.lg },
  recordedImpact: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.successSoft },
  recordedStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  termsHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  termsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { flexBasis: '44%', flexGrow: 1, minWidth: 0, gap: spacing.xxs },
  darkLabel: { color: '#C3E5E4' },
  darkValue: { color: colors.surface },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.successSoft,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.warningSoft,
  },
  forecastCard: { gap: spacing.md, padding: spacing.lg, backgroundColor: colors.infoSoft },
  forecastTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  forecastStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  scenarioForm: { gap: spacing.lg, padding: spacing.lg },
  plannedContribution: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.medium,
  },
  contributionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  formHeading: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  formIcon: {
    width: 45,
    height: 45,
    borderRadius: radius.medium,
    backgroundColor: colors.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: { ...typography.bodySecondary, color: colors.danger },
  impactCard: { gap: spacing.md, padding: spacing.xl, backgroundColor: colors.primaryStrong },
  impactEyebrow: { ...typography.caption, color: colors.mint, fontWeight: '700' },
  impactTitle: { ...typography.screenTitle, color: colors.surface },
  impactBody: { ...typography.body, color: colors.surface },
  impactDates: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.medium,
    padding: spacing.md,
    backgroundColor: '#FFFFFF18',
  },
  impactNote: { ...typography.caption, color: '#C3E5E4' },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    minHeight: 45,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tabSelected: { backgroundColor: colors.primaryStrong },
  tabText: { ...typography.label, color: colors.primary },
  tabTextSelected: { color: colors.surface },
  emptySchedule: { padding: spacing.lg },
});
