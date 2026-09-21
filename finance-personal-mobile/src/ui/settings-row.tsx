import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: number;
  danger?: boolean;
  tone?: 'primary' | 'accent' | 'warning' | 'info';
  onPress?: () => void;
  control?: ReactNode;
  disabled?: boolean;
};
export function SettingsRow({
  icon,
  title,
  subtitle,
  badge,
  danger,
  tone = 'primary',
  onPress,
  control,
  disabled,
}: Props) {
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors[`${tone}Soft`] }]}>
        <Ionicons name={icon} size={22} color={danger ? colors.danger : colors[tone]} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
        <Text style={[typography.cardTitle, danger && { color: colors.primaryStrong }]}>{title}</Text>
        {subtitle && <Text style={typography.bodySecondary}>{subtitle}</Text>}
      </View>
      {badge !== undefined && badge > 0 && <Text style={styles.badge}>{badge}</Text>}
      {control ?? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </>
  );
  return control ? (
    <View style={styles.row}>{content}</View>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={danger ? 'Acción de cierre de sesión. Solicita confirmación.' : subtitle}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, (pressed || disabled) && { opacity: 0.65 }]}
    >
      {content}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    ...typography.label,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
    color: colors.textPrimary,
  },
});
