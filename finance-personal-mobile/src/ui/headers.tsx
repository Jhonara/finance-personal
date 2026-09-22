import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';
import { IconButton } from './primitives';

export function ScreenHeader({
  title,
  subtitle,
  back,
  onBack,
  rightAction,
  titleNumberOfLines,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  titleNumberOfLines?: number;
}) {
  return (
    <View style={styles.header}>
      {back ? <IconButton name="arrow-back" accessibilityLabel="Volver" onPress={onBack} /> : null}
      <View style={styles.grow}>
        <Text
          accessibilityRole="header"
          numberOfLines={titleNumberOfLines}
          style={[typography.screenTitle, styles.title]}
        >
          {title}
        </Text>
        {subtitle && <Text style={typography.bodySecondary}>{subtitle}</Text>}
      </View>
      {rightAction}
    </View>
  );
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[typography.sectionTitle, styles.title]}>
        {title}
      </Text>
      {actionLabel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function MoreListItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={[typography.body, styles.grow]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  grow: { flex: 1 },
  title: { flexShrink: 1 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sectionAction: { minHeight: 48, justifyContent: 'center' },
  action: { ...typography.label, color: colors.primary },
  listItem: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
