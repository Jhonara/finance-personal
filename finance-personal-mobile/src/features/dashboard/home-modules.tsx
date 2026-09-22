import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DashboardMonth } from '@/api/dashboard-api';
import { colors, radius, spacing, typography } from '@/theme';
import { Progress } from '@/ui/progress';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { formatDashboardPeriod, type DashboardPeriod } from './dashboard-period';

export function HomeModules({ data, period }: { data: DashboardMonth; period: DashboardPeriod }) {
  const reducedMotion = useReducedMotion();
  const budgets = (data.budgets?.items ?? []).filter(
    (b) =>
      (b.year === undefined || b.year === period.year) && (b.month === undefined || b.month === period.month),
  );
  const goals = data.savings ?? [];
  const active = goals.filter((g) => !g.completed);
  // Same simple criterion as Tu progreso; no inferred balances or percentages.
  const goal = [...active].sort(
    (a, b) => (b.progressPercent ?? -1) - (a.progressPercent ?? -1) || (a.id ?? 0) - (b.id ?? 0),
  )[0];
  const credits = data.credits ?? [];
  const activeCredits = credits.filter((c) => c.status === 'ACTIVE' || c.status === 'LATE');
  const paid = credits.filter((c) => c.status === 'PAID').length;
  const alerts = (data.alerts ?? []).filter((a) => a.code && a.code !== 'ALL_GOOD');
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Tu plan financiero
      </Text>
      <View style={styles.group}>
        <Module
          title="Presupuestos"
          icon="pie-chart-outline"
          tone={colors.warningSoft}
          onPress={() => router.push({ pathname: '/(app)/budgets', params: period })}
        >
          <Text style={typography.caption}>{formatDashboardPeriod(period)}</Text>
          {budgets.length ? (
            budgets.slice(0, 2).map((b, i) => (
              <Text key={b.id ?? i} style={typography.bodySecondary}>
                {b.categoryName ?? 'Categoría'}
                {Number.isFinite(b.percentageUsed) ? ` · ${Math.round(b.percentageUsed!)}% utilizado` : ''}
                {b.status === 'WARNING' || b.status === 'EXCEEDED' ? ' · Revisa tu límite' : ''}
              </Text>
            ))
          ) : (
            <Text style={typography.bodySecondary}>Dale un límite a tus gastos. Crea tu presupuesto.</Text>
          )}
        </Module>
        <Module
          title="Ahorros"
          icon="ribbon-outline"
          tone={colors.lavenderSoft}
          onPress={() => router.push('/(app)/savings')}
        >
          {goal ? (
            <>
              <Text style={typography.bodySecondary}>
                {goal.name ?? 'Tu meta'}
                {Number.isFinite(goal.progressPercent) ? ` · ${Math.round(goal.progressPercent!)}%` : ''}
              </Text>
              {Number.isFinite(goal.progressPercent) ? (
                <Progress
                  value={goal.progressPercent!}
                  animated={!reducedMotion}
                  color={colors.accent}
                  label={`Avance de ${goal.name ?? 'tu meta'}`}
                />
              ) : null}
              <Text style={typography.caption}>
                {active.length} {active.length === 1 ? 'meta activa' : 'metas activas'}
              </Text>
            </>
          ) : (
            <Text style={typography.bodySecondary}>
              {goals.length
                ? 'Tus metas completadas, en un solo lugar.'
                : 'Haz espacio para lo que quieres. Crea una meta.'}
            </Text>
          )}
        </Module>
        <Module
          title="Créditos"
          icon="card-outline"
          tone={colors.accentSoft}
          onPress={() => router.push('/(app)/credits')}
        >
          <Text style={typography.bodySecondary}>
            {credits.length
              ? `${activeCredits.length} ${activeCredits.length === 1 ? 'activo' : 'activos'} · ${paid} ${paid === 1 ? 'pagado' : 'pagados'}`
              : 'Ten tus pagos a la vista. Registra un crédito.'}
          </Text>
          {activeCredits[0]?.name ? (
            <Text style={typography.caption}>
              {activeCredits[0].name}
              {activeCredits[0].status === 'LATE' ? ' · Revisa tus pagos' : ''}
            </Text>
          ) : null}
        </Module>
      </View>
      {alerts.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver alertas: ${alerts.length} por revisar`}
          onPress={() => router.push('/(app)/alerts')}
          style={({ pressed }) => [styles.alert, pressed && styles.pressed]}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          <Text style={[typography.label, styles.grow]}>
            {alerts.length} {alerts.length === 1 ? 'aviso por revisar' : 'avisos por revisar'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Module({
  title,
  icon,
  tone,
  onPress,
  children,
}: React.PropsWithChildren<{
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${title.toLowerCase()}`}
      accessibilityHint={`Abre ${title.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => [styles.module, pressed && styles.pressed]}
    >
      <View
        style={[styles.badge, { backgroundColor: tone }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name={icon} size={21} color={colors.primaryStrong} />
      </View>
      <View style={styles.grow}>
        <Text style={typography.cardTitle}>{title}</Text>
        <View style={styles.details}>{children}</View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xxl },
  group: {
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  module: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1, minWidth: 0 },
  details: { gap: spacing.xs, marginTop: spacing.xs },
  pressed: { backgroundColor: colors.primarySoft, opacity: 0.86 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.infoSoft,
    minHeight: 48,
  },
});
