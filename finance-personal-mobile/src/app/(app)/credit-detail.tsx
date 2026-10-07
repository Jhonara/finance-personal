import { MotionModal as Modal } from '@/ui/motion-modal';
import { openForm } from '@/features/forms/form-session';
import { formatLocalDate } from '@/utils/local-date';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Credit, CreditPayment } from '@/features/secondary/secondary-api';
import {
  refreshCredit,
  useAlerts,
  useCredit,
  usePlanVsReal,
  useReverseCreditPayment,
  useDeleteCredit,
} from '@/features/secondary/use-secondary';
import { CreditHero, CreditPlanView, CreditValue, creditPanel } from '@/features/credits/credit-components';
import { creditMoney, linkedCreditAlerts } from '@/features/credits/credit-presentation';
import { CreditPaymentForm } from '@/features/credits/credit-payment-form';
import { alreadyReversed, useCreditSubmit } from '@/features/credits/use-credit-submit';
import { claimCreditPaid } from '@/features/credits/credit-paid';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Card, Screen } from '@/ui/primitives';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { ErrorState, Skeleton } from '@/ui/states';
import { BrandSurface } from '@/ui/brand-surface';
import { colors, radius, spacing, typography } from '@/theme';

export default function CreditDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreditDetailContent key={id} id={Number(id)} />;
}
function CreditDetailContent({ id }: { id: number }) {
  const query = useCredit(id);
  const plan = usePlanVsReal(id);
  const alerts = useAlerts();
  const user = useCurrentUser();
  const client = useQueryClient();
  const reverse = useReverseCreditPayment();
  const remove = useDeleteCredit();
  const safety = useCreditSubmit();
  const feedback = useFeedback();
  const { hidden } = usePrivacy();
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState<CreditPayment>();
  const [paid, setPaid] = useState(false);
  const previous = useRef<{ user: number; status: Credit['status'] } | undefined>(undefined);
  useEffect(() => {
    const userId = user.data?.id;
    const status = query.data?.status;
    if (userId === undefined || status === undefined) return;
    const before = previous.current;
    previous.current = { user: userId, status };
    if (before?.user === userId)
      void claimCreditPaid(userId, id, before.status, status)
        .then((show) => {
          if (show) setPaid(true);
        })
        .catch(() => undefined);
  }, [id, query.data?.status, user.data?.id]);
  const review = () => {
    setPayOpen(false);
    void refreshCredit(client, id);
  };
  const revert = () => {
    if (
      safety.busy ||
      safety.uncertain ||
      payment?.paymentId === undefined ||
      payment.paymentStatus !== 'POSTED'
    )
      return;
    const paymentId = payment.paymentId;
    Alert.alert(
      '¿Revertir este pago?',
      'Se restaurará el efecto financiero de la operación y el historial se conservará.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revertir pago',
          style: 'destructive',
          onPress: () =>
            void safety.run(
              async () => {
                const result = await reverse.mutateAsync({ creditId: id, paymentId });
                setPayment(result);
                feedback.show('Pago revertido', 'success');
              },
              (failure) => {
                if (alreadyReversed(failure)) {
                  setPayment((current) => (current ? { ...current, paymentStatus: 'REVERSED' } : current));
                  safety.setError('Este pago ya fue revertido.');
                  feedback.show('Este pago ya fue revertido.', 'info');
                  void refreshCredit(client, id);
                }
              },
            ),
        },
      ],
    );
  };
  const credit = query.data;
  const deleteCurrent = () => {
    if (!credit?.deletable || safety.busy) return;
    Alert.alert(
      '¿Eliminar este crédito?',
      `Se eliminará “${credit.name}” y dejará de incluirse en tu deuda registrada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar crédito',
          style: 'destructive',
          onPress: () =>
            void safety.run(
              async () => {
                await remove.mutateAsync(id);
                feedback.show('Crédito eliminado', 'success');
                router.replace('/(app)/credits');
              },
              () => undefined,
            ),
        },
      ],
    );
  };
  return (
    <Screen
      scroll
      style={styles.screen}
      refreshing={query.isRefetching}
      onRefresh={() => void refreshCredit(client, id)}
    >
      <ScreenHeader
        title={credit?.name ?? 'Crédito'}
        subtitle="Detalle de tu deuda"
        back
        onBack={() => router.back()}
      />
      {query.isPending ? (
        <Skeleton height={200} />
      ) : !credit ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <Text style={typography.caption}>
              No pudimos actualizar. Estos son los últimos datos disponibles.
            </Text>
          )}
          <CreditHero credit={credit} hidden={hidden} />
          {credit.status !== 'PAID' && <Button onPress={() => setPayOpen(true)}>Registrar pago</Button>}
          {credit.status !== 'PAID' && (
            <Card style={[styles.nextPayment, credit.status === 'LATE' && styles.latePayment]}>
              <View style={styles.nextIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color={credit.status === 'LATE' ? colors.danger : colors.primary}
                />
              </View>
              <View style={styles.nextCopy}>
                <Text style={typography.cardTitle}>
                  {credit.status === 'LATE' ? 'Pago pendiente' : 'Próximo pago'}
                </Text>
                {credit.nextPaymentDate && (
                  <Text style={typography.bodySecondary}>{formatLocalDate(credit.nextPaymentDate)}</Text>
                )}
                {credit.expectedPaymentAmount !== undefined && (
                  <Text style={typography.moneyMedium}>
                    {creditMoney(credit.expectedPaymentAmount, credit.currency, hidden)}
                  </Text>
                )}
              </View>
            </Card>
          )}
          <Card style={styles.amortization}>
            <View style={styles.amortizationHeading}>
              <View style={styles.amortizationIcon}>
                <Ionicons name="layers-outline" size={23} color={colors.primary} />
              </View>
              <View style={styles.nextCopy}>
                <Text accessibilityRole="header" style={typography.sectionTitle}>
                  Amortización y aportes
                </Text>
                <Text style={typography.bodySecondary}>
                  Mira cómo avanza tu capital y explora un abono adicional.
                </Text>
              </View>
            </View>
            <Button
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/(app)/credit-amortization', params: { id: credit.id } })
              }
            >
              Ver amortización
            </Button>
            <Text style={typography.caption}>
              Revisa pagos reales, cuotas pendientes y el efecto de un abono sin registrarlo.
            </Text>
            {plan.isPending ? (
              <Skeleton height={100} />
            ) : plan.data ? (
              <CreditPlanView plan={plan.data} currency={credit.currency} hidden={hidden} compact />
            ) : (
              <ErrorState onRetry={() => void plan.refetch()} />
            )}
            {plan.isError && plan.data && (
              <Text style={typography.caption}>Comparación pendiente de actualizar.</Text>
            )}
          </Card>
          {!plan.data && (credit.paidPrincipal !== undefined || credit.paidInterest !== undefined) && (
            <Card style={creditPanel}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                Pagos registrados
              </Text>
              {credit.paidPrincipal !== undefined && (
                <CreditValue
                  label="Capital pagado"
                  value={creditMoney(credit.paidPrincipal, credit.currency, hidden)}
                />
              )}
              {credit.paidInterest !== undefined && (
                <CreditValue
                  label="Intereses pagados"
                  value={creditMoney(credit.paidInterest, credit.currency, hidden)}
                />
              )}
            </Card>
          )}
          <SectionHeader title="Condiciones del crédito" />
          <Card style={creditPanel}>
            {credit.principal !== undefined && (
              <CreditValue
                label="Principal original"
                value={creditMoney(credit.principal, credit.currency, hidden)}
              />
            )}
            {credit.annualRate !== undefined && (
              <CreditValue label="Tasa efectiva anual (EA)" value={`${credit.annualRate}%`} />
            )}
            {credit.termMonths !== undefined && (
              <CreditValue label="Plazo" value={`${credit.termMonths} meses`} />
            )}
            {credit.disbursementDate && (
              <CreditValue label="Fecha de desembolso" value={formatLocalDate(credit.disbursementDate)} />
            )}
            {credit.paymentDay !== undefined && (
              <CreditValue label="Día de pago" value={String(credit.paymentDay)} />
            )}
          </Card>
          {linkedCreditAlerts(alerts.data ?? [], id).map((alert, index) => (
            <Card
              key={`${alert.code}-${index}`}
              style={[creditPanel, { backgroundColor: colors.warningSoft }]}
            >
              <Text style={typography.bodySecondary}>{alert.message}</Text>
            </Card>
          ))}
          {payment && (
            <Card style={creditPanel}>
              <Text style={typography.sectionTitle}>
                {payment.paymentStatus === 'REVERSED' ? 'Pago revertido' : 'Pago registrado'}
              </Text>
              <Text style={typography.caption}>Pago de esta sesión</Text>
              <CreditValue label="Monto" value={creditMoney(payment.totalAmount, credit.currency, hidden)} />
              <CreditValue
                label="Saldo después de la operación"
                value={creditMoney(payment.newBalance, credit.currency, hidden)}
              />
              {payment.paymentId !== undefined && payment.paymentStatus === 'POSTED' && (
                <Button
                  variant="secondary"
                  tone="danger"
                  loading={safety.busy}
                  disabled={safety.uncertain}
                  onPress={revert}
                >
                  Revertir pago
                </Button>
              )}
            </Card>
          )}
          {!!safety.error && (
            <Text accessibilityLiveRegion="polite" style={typography.bodySecondary}>
              {safety.error}
            </Text>
          )}
          {safety.uncertain && (
            <Button variant="secondary" onPress={review}>
              Actualizar crédito
            </Button>
          )}
          <Text style={typography.caption}>Consulta tus pagos registrados desde «Ver amortización».</Text>
          <Button variant="ghost" onPress={() => router.push('/(app)/transactions')}>
            Ver todos los movimientos
          </Button>
          <SectionHeader title="Gestionar crédito" />
          {credit ? (
            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              {credit.openingDate ? (
                <Text style={typography.bodySecondary}>
                  Seguimiento desde el extracto del {formatLocalDate(credit.openingDate)}. Los pagos previos
                  están reflejados en el saldo inicial, no en el historial de esta app.
                </Text>
              ) : null}
              {typeof credit.overdueAmount === 'number' ? (
                <CreditValue
                  label="Cuotas vencidas estimadas"
                  value={creditMoney(credit.overdueAmount, credit.currency, hidden)}
                />
              ) : null}
              <Text style={typography.caption}>
                La deuda total es el capital pendiente. Las cuotas vencidas son pagos del calendario que aún
                no están cubiertos; no se suman otra vez a la deuda ni incluyen mora o seguros.
              </Text>
              {credit.editable ? (
                <Button
                  variant="secondary"
                  disabled={safety.busy}
                  onPress={() => openForm('/(app)/credit-form', { id: String(id), mode: 'edit' })}
                >
                  Editar crédito o saldo inicial
                </Button>
              ) : null}
              {credit.deletable ? (
                <Button variant="ghost" disabled={safety.busy} onPress={deleteCurrent}>
                  Eliminar crédito
                </Button>
              ) : (
                <Text style={typography.caption}>
                  El historial de pagos y desembolsos protege este crédito de edición y eliminación.
                </Text>
              )}
              {safety.error ? (
                <Text style={{ ...typography.caption, color: colors.danger }}>{safety.error}</Text>
              ) : null}
            </Card>
          ) : null}
          <CreditPaymentForm
            key={credit.id}
            credit={credit}
            visible={payOpen}
            onClose={() => setPayOpen(false)}
            onSaved={(result) => {
              setPayment(result);
              setPayOpen(false);
            }}
            onReview={review}
          />
          <Modal visible={paid} animationType="fade" onRequestClose={() => setPaid(false)}>
            <Screen scroll style={{ justifyContent: 'center', gap: spacing.lg }}>
              <BrandSurface tone="credit" style={creditPanel}>
                <Text
                  accessibilityLiveRegion="polite"
                  accessibilityRole="header"
                  style={[typography.screenTitle, { color: colors.success }]}
                >
                  ✓ ¡Crédito pagado!
                </Text>
                <Text style={typography.body}>Cerraste esta deuda por completo.</Text>
                <Button onPress={() => setPaid(false)}>Continuar</Button>
              </BrandSurface>
            </Screen>
          </Modal>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  amortization: { gap: spacing.md, padding: spacing.lg },
  amortizationHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amortizationIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.medium,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPayment: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.large,
    backgroundColor: colors.infoSoft,
  },
  latePayment: { backgroundColor: colors.warningSoft },
  nextIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCopy: { flex: 1, gap: spacing.xs },
});
