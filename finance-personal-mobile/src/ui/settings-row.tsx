import { themedStyleSheet } from '@/theme/themed-styles';
import { MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/theme-provider';

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
  const { palette } = useAppTheme();
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: danger ? palette.dangerSoft : palette[`${tone}Soft`] }]}>
        <Ionicons name={icon} size={22} color={danger ? palette.danger : palette[tone]} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
        <Text style={[typography.cardTitle, { color: danger ? palette.danger : palette.textPrimary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      {badge !== undefined && badge > 0 && <Text style={styles.badge}>{badge}</Text>}
      {control ?? <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />}
    </>
  );
  return control ? (
    <View style={[styles.row, { borderBottomColor: palette.divider }]}>{content}</View>
  ) : (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={danger ? 'Acción de cierre de sesión. Solicita confirmación.' : subtitle}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: palette.divider },
        (pressed || disabled) && { opacity: 0.65 },
      ]}
    >
      {content}
    </MotionPressable>
  );
}
const styles = themedStyleSheet(() => ({
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
}));
