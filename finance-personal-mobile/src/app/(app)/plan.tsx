import { useAppTheme } from '@/theme/theme-provider';
import { Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { actionableAlerts } from '@/features/alerts/alert-presentation';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useAlerts } from '@/features/secondary/use-secondary';
import { Screen, Card } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { SettingsRow } from '@/ui/settings-row';
import { TourTarget } from '@/ui/tour-target';
import { MotionPressable } from '@/ui/motion';
import { themedStyleSheet } from '@/theme/themed-styles';
import { spacing, typography, colors, radius } from '@/theme';

export default function PlanScreen() {
  const { palette } = useAppTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / fontScale < 320;
  const alerts = useAlerts();
  const count = actionableAlerts(alerts.data ?? []).length;
  const period = currentDashboardPeriod();
  return (
    <Screen scroll entry style={{ gap: spacing.lg }}>
      <ScreenHeader title="Menú" subtitle="Tus herramientas, en un solo lugar." />
      <View style={[styles.primaryActions, stacked && styles.primaryActionsStacked]}>
        {[
          {
            title: 'Reportes',
            subtitle: 'Entiende tus ingresos y gastos.',
            icon: 'stats-chart-outline' as const,
            route: '/(app)/reports' as const,
            ink: palette.info,
            soft: palette.infoSoft,
          },
          {
            title: 'Presupuestos',
            subtitle: 'Organiza tus límites de gasto.',
            icon: 'pie-chart-outline' as const,
            route: '/(app)/budgets' as const,
            ink: palette.primary,
            soft: palette.primarySoft,
          },
        ].map((action) => (
          <MotionPressable
            key={action.route}
            accessibilityRole="button"
            accessibilityLabel={action.title}
            accessibilityHint={action.subtitle}
            onPress={() => router.push({ pathname: action.route, params: period })}
            style={[styles.primaryAction, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <View style={styles.primaryActionTop}>
              <View style={[styles.primaryActionIcon, { backgroundColor: action.soft }]}>
                <Ionicons name={action.icon} size={25} color={action.ink} />
              </View>
              <Ionicons name="arrow-forward" size={18} color={action.ink} />
            </View>
            <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>{action.title}</Text>
            <Text style={[typography.caption, { color: palette.textSecondary }]}>{action.subtitle}</Text>
          </MotionPressable>
        ))}
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Planifica
        </Text>
        <Card style={{ paddingHorizontal: spacing.md }}>
          <SettingsRow
            icon="repeat-outline"
            title="Ingresos y gastos fijos"
            subtitle="Salario, servicios y próximas cuotas."
            onPress={() => router.push('/(app)/recurrences')}
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
        </Card>
      </View>
      <Card style={{ paddingHorizontal: spacing.md }}>
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
        <Text accessibilityRole="header" style={styles.sectionTitle}>
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

const styles = themedStyleSheet(() => ({
  primaryActions: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  primaryActionsStacked: { flexDirection: 'column' },
  primaryAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 140,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.large,
    borderWidth: 1,
  },
  primaryActionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryActionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.label, color: colors.textSecondary },
}));
