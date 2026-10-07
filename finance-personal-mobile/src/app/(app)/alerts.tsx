import { router } from 'expo-router';
import { TourTarget } from '@/ui/tour-target';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '@/ui/headers';
import { Card, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { useAlerts } from '@/features/secondary/use-secondary';
import { actionableAlerts, alertLevels, presentAlert } from '@/features/alerts/alert-presentation';
import { FinancialAlertCard } from '@/features/alerts/financial-alert-card';
import { colors, radius, spacing, typography } from '@/theme';
export default function AlertsScreen() {
  const q = useAlerts();
  const alerts = actionableAlerts(q.data ?? []);
  const important = alerts.some((alert) => presentAlert(alert).level === 'Importante');
  return (
    <Screen entry scroll refreshing={q.isRefetching} onRefresh={() => void q.refetch()} style={styles.screen}>
      <TourTarget id="alerts-heading">
        <ScreenHeader
          title="Alertas"
          subtitle="Lo que merece tu atención."
          back
          onBack={() => router.back()}
        />
      </TourTarget>
      {q.isPending ? (
        <SkeletonRow />
      ) : q.isError ? (
        <ErrorState onRetry={() => void q.refetch()} />
      ) : alerts.length ? (
        <>
          <Card style={[styles.summary, important && styles.summaryImportant]}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name={important ? 'alert-circle-outline' : 'notifications-outline'}
                size={25}
                color={important ? colors.danger : colors.warning}
              />
            </View>
            <View style={styles.summaryCopy}>
              <Text style={[styles.eyebrow, important && { color: colors.danger }]}>PARA REVISAR</Text>
              <Text style={typography.sectionTitle}>
                {alerts.length === 1 ? '1 aviso para ti' : `${alerts.length} avisos para ti`}
              </Text>
              <Text style={typography.bodySecondary}>
                Abre cada aviso para ver el contexto y decidir qué hacer.
              </Text>
            </View>
          </Card>
          {alertLevels.map((level) => {
            const group = alerts.filter((alert) => presentAlert(alert).level === level);
            return group.length ? (
              <View key={level} style={styles.group}>
                <Text accessibilityRole="header" style={typography.sectionTitle}>
                  {level}
                </Text>
                {group.map((alert, index) => (
                  <FinancialAlertCard key={`${presentAlert(alert).key}:${index}`} alert={alert} />
                ))}
              </View>
            ) : null;
          })}
        </>
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

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  summary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.warningSoft,
  },
  summaryImportant: { backgroundColor: colors.dangerSoft },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  eyebrow: { ...typography.caption, color: colors.warning, fontWeight: '700', letterSpacing: 0.4 },
  group: { gap: spacing.md },
});
