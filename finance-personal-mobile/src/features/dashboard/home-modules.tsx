import { MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { DashboardMonth } from '@/api/dashboard-api';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { Progress } from '@/ui/progress';
import { formatDashboardPeriod, type DashboardPeriod } from './dashboard-period';
import { homeColumns, homePlan } from './home-plan';

export function HomeModules({ data, period }: { data: DashboardMonth; period: DashboardPeriod }) {
  const reducedMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const columns = homeColumns(width, fontScale);
  const tileWidth = columns === 1 ? width - spacing.lg * 2 : (width - spacing.lg * 2 - spacing.md) / 2;
  const plan = homePlan(data, period);
  const tiles = [
    {
      title: 'Presupuestos',
      summary: plan.budget,
      icon: 'pie-chart-outline',
      color: colors.warning,
      surface: colors.warningSoft,
      onPress: () => router.push({ pathname: '/(app)/budgets', params: period }),
      context: formatDashboardPeriod(period),
      progress: plan.budgetPercent,
    },
    {
      title: 'Ahorros',
      summary: plan.saving,
      icon: 'ribbon-outline',
      color: colors.accent,
      surface: colors.lavenderSoft,
      onPress: () => router.push('/(app)/savings'),
      progress: plan.savingPercent,
    },
    {
      title: 'Créditos',
      summary: plan.credit,
      icon: 'card-outline',
      color: colors.credit,
      surface: colors.creditSoft,
      onPress: () => router.push('/(app)/credits'),
      progress: undefined,
    },
    {
      title: 'Alertas',
      summary: plan.alerts,
      icon: plan.alertState === 'clear' ? 'checkmark-circle-outline' : 'notifications-outline',
      color:
        plan.alertState === 'important'
          ? colors.danger
          : plan.alertState === 'attention'
            ? colors.warning
            : plan.alertState === 'clear'
              ? colors.success
              : colors.info,
      surface:
        plan.alertState === 'important'
          ? colors.dangerSoft
          : plan.alertState === 'attention'
            ? colors.warningSoft
            : plan.alertState === 'clear'
              ? colors.successSoft
              : colors.infoSoft,
      onPress: () => router.push('/(app)/alerts'),
      progress: undefined,
    },
  ] as const;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Tu plan
      </Text>
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <MotionPressable
            key={tile.title}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${tile.title.toLowerCase()}`}
            accessibilityValue={{ text: `${'context' in tile ? tile.context : ''} ${tile.summary}`.trim() }}
            accessibilityHint={`Abre ${tile.title.toLowerCase()}`}
            onPress={tile.onPress}
            style={({ pressed }) => [
              styles.tile,
              { width: tileWidth, flexBasis: tileWidth },
              pressed && { opacity: 0.88, transform: [{ scale: reducedMotion ? 1 : 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={[tile.surface, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tileSurface}
            >
              <View style={[styles.orb, { backgroundColor: tile.surface }]} pointerEvents="none" />
              <View
                style={styles.icons}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={[styles.badge, { backgroundColor: colors.surface }]}>
                  <Ionicons name={tile.icon} size={23} color={tile.color} />
                </View>
                <Ionicons name="arrow-forward" size={18} color={tile.color} />
              </View>
              <View style={styles.tileCopy}>
                <Text numberOfLines={1} style={typography.cardTitle}>
                  {tile.title}
                </Text>
                <Text numberOfLines={2} style={styles.summary}>
                  {tile.summary}
                </Text>
              </View>
              {tile.progress !== undefined ? (
                <Progress value={tile.progress} color={tile.color} label={`${tile.title}: ${tile.summary}`} />
              ) : (
                <View style={[styles.accent, { backgroundColor: tile.color }]} />
              )}
            </LinearGradient>
          </MotionPressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexGrow: 0,
    minWidth: 0,
    minHeight: 152,
    borderRadius: radius.large,
    overflow: 'hidden',
    ...shadows.card,
  },
  tileSurface: {
    flex: 1,
    minHeight: 152,
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
  },
  orb: { position: 'absolute', width: 110, height: 110, borderRadius: 55, right: -52, top: -48 },
  icons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileCopy: { gap: spacing.xs },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { ...typography.bodySecondary, color: colors.textSecondary },
  accent: { width: 28, height: 4, borderRadius: radius.pill },
});
