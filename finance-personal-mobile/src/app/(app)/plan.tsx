import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { actionableAlerts } from '@/features/alerts/alert-presentation';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useAlerts } from '@/features/secondary/use-secondary';
import { Screen, Card } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { SettingsRow } from '@/ui/settings-row';
import { TourTarget } from '@/ui/tour-target';
import { spacing, typography, colors } from '@/theme';

export default function PlanScreen() {
  const alerts = useAlerts();
  const count = actionableAlerts(alerts.data ?? []).length;
  const period = currentDashboardPeriod();
  return (
    <Screen scroll entry style={{ gap: spacing.lg }}>
      <ScreenHeader title="Menú" subtitle="Tus herramientas, en un solo lugar." />
      <Card style={{ paddingHorizontal: spacing.md }}>
        <SettingsRow
          icon="repeat-outline"
          title="Ingresos y gastos fijos"
          subtitle="Salario, servicios y próximas cuotas."
          onPress={() => router.push('/(app)/recurrences')}
        />
        <SettingsRow
          icon="stats-chart-outline"
          title="Reportes"
          subtitle="Entiende tus ingresos y gastos."
          tone="info"
          onPress={() => router.push({ pathname: '/(app)/reports', params: period })}
        />
        <SettingsRow
          icon="pie-chart-outline"
          title="Presupuestos"
          subtitle="Límites de gasto por categoría."
          onPress={() => router.push({ pathname: '/(app)/budgets', params: period })}
        />
        <SettingsRow
          icon="flag-outline"
          title="Metas de ahorro"
          subtitle="Objetivos y aportes."
          onPress={() => router.push('/(app)/savings')}
        />
        <TourTarget id="plan-credits">
          <SettingsRow
            icon="card-outline"
            title="Créditos"
            subtitle="Saldos, cuotas y pagos."
            tone="accent"
            onPress={() => router.push('/(app)/credits')}
          />
        </TourTarget>
        <SettingsRow
          icon="notifications-outline"
          title="Alertas"
          badge={count}
          subtitle={
            alerts.isError
              ? 'Abre para reintentar la consulta.'
              : alerts.isPending
                ? 'Consultando avisos…'
                : count
                  ? 'Hay asuntos por revisar.'
                  : 'Sin avisos pendientes.'
          }
          tone="warning"
          onPress={() => router.push('/(app)/alerts')}
        />
      </Card>
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={{ ...typography.label, color: colors.textSecondary }}>
          Tu espacio
        </Text>
        <Card style={{ paddingHorizontal: spacing.md }}>
          <SettingsRow
            icon="pricetags-outline"
            title="Categorías"
            subtitle="Organiza tus ingresos y gastos."
            onPress={() => router.push('/(app)/categories')}
          />
          <SettingsRow
            icon="settings-outline"
            title="Perfil y ajustes"
            subtitle="Apariencia y preferencias."
            onPress={() => router.push('/(app)/more')}
          />
          <SettingsRow
            icon="help-circle-outline"
            title="Ayuda"
            subtitle="Guías y ejemplos sencillos."
            onPress={() => router.push('/(app)/guide')}
          />
        </Card>
      </View>
    </Screen>
  );
}
