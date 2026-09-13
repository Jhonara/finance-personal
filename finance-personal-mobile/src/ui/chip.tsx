import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <View accessibilityRole="text" style={[styles.chip, toneStyles[tone]]}>
      <Text style={[styles.text, toneTextStyles[tone]]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  text: { ...typography.caption, fontWeight: '600' },
});

const toneStyles = {
  neutral: { backgroundColor: colors.surfaceSecondary },
  primary: { backgroundColor: colors.primarySoft },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
  info: { backgroundColor: colors.infoSoft },
} as const;

const toneTextStyles = {
  neutral: { color: colors.textSecondary },
  primary: { color: colors.primary },
  success: { color: colors.success },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
  info: { color: colors.info },
} as const;
