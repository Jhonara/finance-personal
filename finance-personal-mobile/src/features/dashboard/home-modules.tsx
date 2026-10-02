import { MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { DashboardMonth } from '@/api/dashboard-api';
import { colors, radius, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/ui/use-reduced-motion';
import { formatDashboardPeriod, type DashboardPeriod } from './dashboard-period';
import { homeColumns, homePlan } from './home-plan';

export function HomeModules({ data, period }: { data: DashboardMonth; period: DashboardPeriod }) {
  const reducedMotion = useReducedMotion();
  const { width, fontScale } = useWindowDimensions();
  const columns = homeColumns(width, fontScale);
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
    },
    {
      title: 'Ahorros',
      summary: plan.saving,
      icon: 'ribbon-outline',
      color: colors.accent,
      surface: colors.lavenderSoft,
      onPress: () => router.push('/(app)/savings'),
    },
    {
      title: 'Créditos',
      summary: plan.credit,
      icon: 'card-outline',
      color: colors.credit,
      surface: colors.creditSoft,
      onPress: () => router.push('/(app)/credits'),
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
              { backgroundColor: tile.surface, flexBasis: columns === 1 ? '100%' : '47%' },
              pressed && { opacity: 0.86, transform: [{ scale: reducedMotion ? 1 : 0.98 }] },
            ]}
          >
            <View
              style={styles.icons}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View style={styles.badge}>
                <Ionicons name={tile.icon} size={23} color={tile.color} />
              </View>
              <Ionicons name="arrow-forward" size={18} color={tile.color} />
            </View>
            <Text style={typography.cardTitle}>{tile.title}</Text>
            <Text style={styles.summary}>{tile.summary}</Text>
          </MotionPressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexGrow: 1, minWidth: 0, padding: spacing.md, borderRadius: radius.large, gap: spacing.sm },
  icons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.medium,
    backgroundColor: colors.brandGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: { ...typography.bodySecondary, color: colors.textPrimary },
});
