import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { MotionPressable } from './motion';

type Tone = 'income' | 'expense' | 'debt' | 'warning' | 'info';
export function StatusBadge({ label, tone = 'info' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors[`${tone}Soft`] }]}>
      <Text style={[typography.caption, { color: colors[tone], fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

/** Presentation only. Amounts are formatted by the caller from the existing financial contracts. */
export function FinancialMetric({
  label,
  value,
  caption,
  tone = 'info',
  icon,
  onPress,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: Tone;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}. ${value}${caption ? `. ${caption}` : ''}`}
      accessible
      style={styles.metric}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: colors[`${tone}Soft`] }]}>
          <Ionicons name={icon} size={20} color={colors[tone]} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={typography.bodySecondary}>{label}</Text>
        <Text style={[typography.moneyMedium, { color: colors[tone] }]}>{value}</Text>
        {caption ? <Text style={typography.caption}>{caption}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </MotionPressable>
  );
}
const styles = themedStyleSheet(() => ({
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.small,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
}));
