import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { TourTarget } from '@/ui/tour-target';
import { ScreenHeader } from '@/ui/headers';
import { Button, Screen } from '@/ui/primitives';
import { Disclosure } from '@/ui/disclosure';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { useAlerts, useAlertHistory, useCredits } from '@/features/secondary/use-secondary';
import { actionableAlerts, alertLevels, presentAlert } from '@/features/alerts/alert-presentation';
import { FinancialAlertCard } from '@/features/alerts/financial-alert-card';
import type { Alert } from '@/features/secondary/secondary-api';
import { spacing, typography } from '@/theme';

export default function AlertsScreen() {
  const [history, setHistory] = useState(false);
  const current = useAlerts();
  const past = useAlertHistory(history);
  const credits = useCredits();
  const q = history ? past : current;
  const alerts = actionableAlerts(current.data ?? []);
  const snoozed = (current.data ?? []).filter((alert) => alert.state === 'SNOOZED');
  const card = (alert: Alert) => (
    <FinancialAlertCard
      key={presentAlert(alert).key}
      alert={alert}
      credit={credits.data?.find((credit) => credit.id === alert.data?.creditId)}
    />
  );
  return (
    <Screen
      entry
      scroll
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      style={{ gap: spacing.lg }}
    >
      <TourTarget id="alerts-heading">
        <ScreenHeader
          title="Alertas"
          subtitle="Qué revisar y cómo seguir."
          back
          onBack={() => router.back()}
        />
      </TourTarget>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button variant={history ? 'secondary' : 'primary'} onPress={() => setHistory(false)}>
            Pendientes
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button variant={history ? 'primary' : 'secondary'} onPress={() => setHistory(true)}>
            Historial
          </Button>
        </View>
      </View>
      {q.isPending ? (
        <SkeletonRow />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : history ? (
        past.data?.length ? (
          <>
            <Text style={typography.caption}>
              Últimos 30 avisos que se resolvieron o cuyo período terminó. Se guardan desde que consultas esta
              sección o Inicio.
            </Text>
            {past.data.map(card)}
          </>
        ) : (
          <EmptyState
            title="Aún no hay historial"
            description="Aquí verás los avisos que dejen de estar pendientes."
          />
        )
      ) : (
        <>
          {alerts.length ? (
            <>
              <Text style={typography.bodySecondary}>
                {alerts.length} {alerts.length === 1 ? 'pendiente' : 'pendientes'} ·{' '}
                {alerts.filter((alert) => !alert.read).length} sin leer
              </Text>
              {alertLevels.map((level) => {
                const group = alerts.filter((alert) => presentAlert(alert).level === level);
                return group.length ? (
                  <View key={level} style={{ gap: spacing.md }}>
                    <Text accessibilityRole="header" style={typography.sectionTitle}>
                      {level}
                    </Text>
                    {group.map(card)}
                  </View>
                ) : null;
              })}
            </>
          ) : (
            <EmptyState
              tone={snoozed.length ? 'info' : 'success'}
              title={snoozed.length ? 'Tus avisos están pospuestos' : 'Sin avisos pendientes'}
              description={
                snoozed.length
                  ? 'Puedes retomarlos abajo. Posponer no cambia tus cuentas.'
                  : 'No encontramos situaciones pendientes con los datos registrados.'
              }
            />
          )}
          {snoozed.length > 0 && (
            <Disclosure title={`Pospuestas · ${snoozed.length}`}>{snoozed.map(card)}</Disclosure>
          )}
        </>
      )}
      <Disclosure title="Cómo funcionan las alertas">
        <Text style={typography.bodySecondary}>
          Marcar como vista solo indica que la leíste. El aviso permanece hasta que cambien los datos que lo
          originaron.
        </Text>
        <Text style={typography.bodySecondary}>
          Posponer lo aparta hasta mañana, según el horario de Colombia. Se revisa al actualizar la app; no
          envía una notificación al teléfono.
        </Text>
        <Text style={typography.bodySecondary}>
          Los avisos dependen de lo que has registrado. Un período finalizado se archiva, aunque su situación
          no se haya resuelto.
        </Text>
      </Disclosure>
    </Screen>
  );
}
