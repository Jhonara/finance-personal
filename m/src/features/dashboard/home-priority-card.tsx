import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { DashboardMonth } from '@/api/dashboard-api';
import { MotionPressable } from '@/ui/motion';
import { Progress } from '@/ui/progress';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { homePriorities, homePriorityHighlight, type HomePriority } from './home-priority';
import type { DashboardPeriod } from './dashboard-period';

export function HomePriorityCard({
  priority,
  data,
  period,
}: {
  priority: HomePriority;
  data: DashboardMonth;
  period: DashboardPeriod;
}) {
  const highlight = homePriorityHighlight(priority, data, period);
  if (!highlight) return null;
  const option = homePriorities.find((item) => item.value === priority)!;
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={highlight.action}
      accessibilityHint={`${highlight.title}. ${highlight.description}`}
      onPress={() => router.push(highlight.destination)}
      style={styles.card}
    >
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name={option.icon} size={21} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.context}>{highlight.context}</Text>
          <Text style={styles.title}>{highlight.title}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={colors.primary} />
      </View>
      <Text style={styles.description}>{highlight.description}</Text>
      {highlight.percentage !== undefined ? (
        <Progress
          value={highlight.percentage}
          color={priority === 'expenses' && highlight.percentage >= 100 ? colors.warning : colors.success}
          label={highlight.title}
        />
      ) : null}
      <Text style={styles.link}>{highlight.action}</Text>
    </MotionPressable>
  );
}
const styles = themedStyleSheet(() => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  context: { ...typography.caption, fontSize: 10, color: colors.textSecondary },
  title: { ...typography.label, color: colors.textPrimary },
  description: { ...typography.caption, color: colors.textSecondary },
  link: { ...typography.caption, color: colors.primary, fontWeight: '700' },
}));
