import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { DashboardMonth } from '@/api/dashboard-api';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { Progress } from '@/ui/progress';
import { CreditEntryCard } from '@/features/credits/credit-entry-card';
import { formatDashboardPeriod, type DashboardPeriod } from './dashboard-period';
import { homeColumns, homePlan } from './home-plan';

export function HomeModules({ data, period }: { data: DashboardMonth; period: DashboardPeriod }) {
  const { width, fontScale } = useWindowDimensions();
  const columns = homeColumns(width, fontScale);
  const tileWidth = columns === 1 ? width - spacing.lg * 2 : (width - spacing.lg * 2 - spacing.sm) / 2;
  const plan = homePlan(data, period);
  const top = [
    {
      title: 'Presupuestos',
      summary: plan.budget,
      icon: 'pie-chart-outline' as const,
      color: colors.danger,
      soft: '#FFF0EE',
      progress: plan.budgetPercent,
      onPress: () => router.push({ pathname: '/(app)/budgets', params: period }),
      context: formatDashboardPeriod(period),
    },
    {
      title: 'Ahorros',
      summary: plan.saving,
      icon: 'shield-checkmark-outline' as const,
      color: colors.success,
      soft: '#E5FAEF',
      progress: plan.savingPercent,
      onPress: () => router.push('/(app)/savings'),
      context: '',
    },
  ];
  const alertsColor =
    plan.alertState === 'important'
      ? colors.danger
      : plan.alertState === 'attention'
        ? colors.warning
        : plan.alertState === 'clear'
          ? colors.success
          : colors.info;
  const rows = [
    {
      title: 'Alertas',
      summary: plan.alerts,
      icon:
        plan.alertState === 'clear'
          ? ('checkmark-circle-outline' as const)
          : ('notifications-outline' as const),
      color: alertsColor,
      soft: plan.alertState === 'clear' ? '#E5FAEF' : plan.alertState === 'unknown' ? '#E8F7FC' : '#FFF2EB',
      onPress: () => router.push('/(app)/alerts'),
    },
  ];
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        Tu plan
      </Text>
      <View style={styles.grid}>
        {top.map((tile) => (
          <MotionPressable
            key={tile.title}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${tile.title.toLowerCase()}`}
            accessibilityValue={{ text: `${tile.context} ${tile.summary}`.trim() }}
            onPress={tile.onPress}
            style={[styles.tile, { width: tileWidth, flexBasis: tileWidth }]}
          >
            <LinearGradient colors={[tile.soft, colors.surface]} style={styles.tileSurface}>
              <View style={styles.tileTop}>
                <View style={[styles.tileIcon, { backgroundColor: tile.soft }]}>
                  <Ionicons name={tile.icon} size={21} color={tile.color} />
                </View>
                {tile.progress !== undefined ? (
                  <Text style={[styles.percentPill, { color: tile.color, backgroundColor: tile.soft }]}>
                    {tile.progress.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%
                  </Text>
                ) : (
                  <Ionicons name="arrow-forward" size={16} color={tile.color} />
                )}
              </View>
              <View style={styles.tileCopy}>
                <Text numberOfLines={1} style={styles.tileTitle}>
                  {tile.title}
                </Text>
                <Text numberOfLines={2} style={styles.tileSummary}>
                  {tile.summary}
                </Text>
              </View>
              {tile.progress !== undefined ? (
                <Progress value={tile.progress} color={tile.color} label={`${tile.title}: ${tile.summary}`} />
              ) : (
                <Text style={[styles.explore, { color: tile.color }]}>Explorar →</Text>
              )}
            </LinearGradient>
          </MotionPressable>
        ))}
      </View>
      <View style={styles.rows}>
        <CreditEntryCard summary={plan.credit} />
        {rows.map((row) => (
          <MotionPressable
            key={row.title}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${row.title.toLowerCase()}`}
            accessibilityValue={{ text: row.summary }}
            onPress={row.onPress}
            style={styles.row}
          >
            <View style={[styles.rowIcon, { backgroundColor: row.soft }]}>
              <Ionicons name={row.icon} size={20} color={row.color} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text numberOfLines={1} style={styles.rowSummary}>
                {row.summary}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={row.color} />
          </MotionPressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginTop: spacing.xl },
  heading: { ...typography.sectionTitle, fontSize: 17, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { borderRadius: radius.large, minWidth: 0, overflow: 'hidden', ...shadows.card },
  tileSurface: { minHeight: 132, padding: spacing.md, gap: spacing.sm, justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentPill: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    overflow: 'hidden',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontWeight: '700',
  },
  tileCopy: { gap: spacing.xs },
  tileTitle: { ...typography.label, fontSize: 13, lineHeight: 17, color: colors.textPrimary },
  tileSummary: { ...typography.caption, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  explore: { ...typography.caption, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  rows: { gap: spacing.sm },
  row: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: spacing.xxs },
  rowTitle: { ...typography.label, fontSize: 12, lineHeight: 16, color: colors.textPrimary },
  rowSummary: { ...typography.caption, fontSize: 11, lineHeight: 14, color: colors.textSecondary },
});
