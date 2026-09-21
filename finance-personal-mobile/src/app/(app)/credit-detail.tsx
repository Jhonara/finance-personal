import { formatLocalDate } from '@/utils/local-date';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { Credit, CreditPayment } from '@/features/secondary/secondary-api';
import {
  refreshCredit,
  useAlerts,
  useCredit,
  usePlanVsReal,
  useReverseCreditPayment,
} from '@/features/secondary/use-secondary';
import { CreditHero, CreditPlanView, CreditValue, creditPanel } from '@/features/credits/credit-components';
import { creditMoney, linkedCreditAlerts } from '@/features/credits/credit-presentation';
import { CreditPaymentForm } from '@/features/credits/credit-payment-form';
import { CreditSimulationForm } from '@/features/credits/credit-simulation-form';
import { alreadyReversed, useCreditSubmit } from '@/features/credits/use-credit-submit';
import { claimCreditPaid } from '@/features/credits/credit-paid';
import { useCurrentUser } from '@/features/profile/use-current-user';
import { useFeedback } from '@/feedback/feedback-provider';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Button, Card, Screen } from '@/ui/primitives';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { ErrorState, Skeleton } from '@/ui/states';
import { BrandSurface } from '@/ui/brand-surface';
import { colors, spacing, typography } from '@/theme';

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
  const safety = useCreditSubmit();
  const feedback = useFeedback();
  const { hidden } = usePrivacy();
  const [payOpen, setPayOpen] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
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
  return (
    <Screen
      scroll
      style={{ gap: spacing.lg }}
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
          <SectionHeader title="Resumen" />
          <CreditHero credit={credit} hidden={hidden} />
          {credit.status !== 'PAID' && (
            <Card style={creditPanel}>
              {(credit.nextPaymentDate || credit.expectedPaymentAmount !== undefined) && (
                <Text style={typography.sectionTitle}>Próximo pago</Text>
              )}
              {credit.nextPaymentDate && (
                <Text style={typography.cardTitle}>{formatLocalDate(credit.nextPaymentDate)}</Text>
              )}
              {credit.expectedPaymentAmount !== undefined && (
                <Text style={typography.moneyMedium}>
                  {creditMoney(credit.expectedPaymentAmount, credit.currency, hidden)}
                </Text>
              )}
              {credit.status === 'LATE' && (
                <Text style={[typography.bodySecondary, { color: colors.expense }]}>Pago pendiente</Text>
              )}
            </Card>
          )}
          <SectionHeader title="Condiciones" />
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
          <SectionHeader title="Seguimiento" />
          <Card style={creditPanel}>
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
          <Card style={creditPanel}>
            <Text accessibilityRole="header" style={typography.sectionTitle}>
              Plan vs. realidad
            </Text>
            {plan.isPending ? (
              <Skeleton height={100} />
            ) : plan.data ? (
              <CreditPlanView plan={plan.data} currency={credit.currency} hidden={hidden} />
            ) : (
              <ErrorState onRetry={() => void plan.refetch()} />
            )}
            {plan.isError && plan.data && (
              <Text style={typography.caption}>Comparación pendiente de actualizar.</Text>
            )}
          </Card>
          <Card style={creditPanel}>
            <Text accessibilityRole="header" style={typography.sectionTitle}>
              Herramientas
            </Text>
            {credit.status !== 'PAID' && <Button onPress={() => setPayOpen(true)}>Registrar pago</Button>}
            <Text style={typography.bodySecondary}>Explora escenarios antes de tomar una decisión.</Text>
            <Text style={typography.caption}>Esto no modifica tu crédito.</Text>
            <Button variant="secondary" onPress={() => setSimulationOpen(true)}>
              Simular
            </Button>
          </Card>
          <Text style={typography.caption}>
            El historial de pagos de este crédito aún no está disponible.
          </Text>
          <Button variant="ghost" onPress={() => router.push('/(app)/transactions')}>
            Ver todos los movimientos
          </Button>
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
          {simulationOpen && (
            <CreditSimulationForm credit={credit} onClose={() => setSimulationOpen(false)} />
          )}
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
