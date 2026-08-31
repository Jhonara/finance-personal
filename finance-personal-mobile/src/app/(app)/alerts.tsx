import { router } from 'expo-router';
import { AlertCard } from '@/ui/financial';
import { ScreenHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { useAlerts, useSeenAlert } from '@/features/secondary/use-secondary';
import { useFeedback } from '@/feedback/feedback-provider';
const titles: Record<string, string> = {
  BUDGET_WARNING: 'Presupuesto cerca del límite',
  BUDGET_EXCEEDED: 'Presupuesto excedido',
  CREDIT_BEHIND: 'Crédito atrasado',
  HIGH_INTEREST: 'Tasa de crédito alta',
  OPPORTUNITY_PREPAY: 'Oportunidad de abono',
  SPEND_SPIKE: 'Gasto inusual',
  ALL_GOOD: 'Todo está al día',
};
const severity = (s: string | undefined): 'info' | 'warning' | 'critical' =>
  s === 'CRITICAL' ? 'critical' : s === 'WARNING' ? 'warning' : 'info';
export default function AlertsScreen() {
  const q = useAlerts();
  const seen = useSeenAlert();
  const feedback = useFeedback();
  if (q.isPending)
    return (
      <Screen>
        <ScreenHeader title="Alertas" />
        <SkeletonRow />
      </Screen>
    );
  if (q.isError)
    return (
      <Screen>
        <ScreenHeader title="Alertas" />
        <ErrorState onRetry={() => void q.refetch()} />
      </Screen>
    );
  const alerts = q.data.filter((x) => x.code !== 'ALL_GOOD');
  return (
    <Screen scroll refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <ScreenHeader title="Alertas" back onBack={() => router.back()} />
      {alerts.length ? (
        alerts.map((x) => (
          <AlertCard
            key={x.code}
            severity={severity(x.severity)}
            title={titles[x.code ?? ''] ?? 'Aviso financiero'}
            description={x.message ?? ''}
            actionLabel="Marcar como vista"
            onAction={() =>
              seen.mutate(x.code!, {
                onError: () => {
                  void q.refetch();
                  feedback.show(
                    'No pudimos actualizar la alerta. Revisa tu conexión e inténtalo nuevamente.',
                  );
                },
              })
            }
          />
        ))
      ) : (
        <EmptyState title="Todo está al día" description="No tienes alertas financieras pendientes." />
      )}
    </Screen>
  );
}
