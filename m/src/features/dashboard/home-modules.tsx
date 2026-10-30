import { themedStyleSheet } from '@/theme/themed-styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Text, View, useWindowDimensions } from 'react-native';

import type { DashboardMonth } from '@/api/dashboard-api';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MotionPressable } from '@/ui/motion';
import { Progress } from '@/ui/progress';
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
      soft: colors.expenseSoft,
      progress: plan.budgetPercent,
      onPress: () => router.push({ pathname: '/(app)/budgets', params: period }),
      context: formatDashboardPeriod(period),
    },
    {
      title: 'Ahorros',
      summary: plan.saving,
      icon: 'shield-checkmark-outline' as const,
      color: colors.success,
      soft: colors.successSoft,
      progress: plan.savingPercent,
      onPress: () => router.push('/(app)/savings'),
      context: '',
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
    </View>
  );
}

const styles = themedStyleSheet(() => ({
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
}));
