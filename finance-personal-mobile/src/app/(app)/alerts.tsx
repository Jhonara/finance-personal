import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ScreenHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { useAlerts } from '@/features/secondary/use-secondary';
import { actionableAlerts, alertLevels, presentAlert } from '@/features/alerts/alert-presentation';
import { FinancialAlertCard } from '@/features/alerts/financial-alert-card';
import { spacing, typography } from '@/theme';
export default function AlertsScreen() {
  const q = useAlerts();
  const alerts = actionableAlerts(q.data ?? []);
  return (
    <Screen scroll refreshing={q.isRefetching} onRefresh={() => void q.refetch()} style={{ gap: spacing.lg }}>
      <ScreenHeader title="Alertas" subtitle="Lo que merece tu atención." back onBack={() => router.back()} />
      {q.isPending ? (
        <SkeletonRow />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : alerts.length ? (
        alertLevels.map((level) => {
          const group = alerts.filter((alert) => presentAlert(alert).level === level);
          return group.length ? (
            <View key={level} style={{ gap: spacing.md }}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                {level}
              </Text>
              {group.map((alert, index) => (
                <FinancialAlertCard key={`${presentAlert(alert).key}:${index}`} alert={alert} />
              ))}
            </View>
          ) : null;
        })
      ) : (
        <EmptyState
          tone="success"
          title={q.data?.some((alert) => alert.code === 'ALL_GOOD') ? 'Todo en orden' : 'Todo en calma'}
          description={
            q.data?.some((alert) => alert.code === 'ALL_GOOD')
              ? 'No encontramos alertas importantes para este período.'
              : 'No hay alertas que necesiten tu atención.'
          }
        />
      )}
    </Screen>
  );
}
