import { MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { BrandAvatar, BrandLogo, BrandMark } from './brand-identity';
import { IconButton } from './primitives';

export function HomeBrandHeader({
  title,
  subtitle,
  profileName,
  privacyHidden,
  onPrivacy,
  onProfile,
}: {
  title: string;
  subtitle: string;
  profileName?: string;
  privacyHidden: boolean;
  onPrivacy(): void;
  onProfile(): void;
}) {
  return (
    <View style={styles.homeHeader}>
      <View style={styles.brandRow}>
        <BrandLogo compact />
        <View style={styles.headerActions}>
          <IconButton
            name={privacyHidden ? 'eye-off-outline' : 'eye-outline'}
            accessibilityLabel={privacyHidden ? 'Mostrar importes' : 'Ocultar importes'}
            onPress={onPrivacy}
          />
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil y preferencias"
            onPress={onProfile}
            style={styles.profileAction}
          >
            <BrandAvatar size={40}>
              <Text style={styles.profileInitial}>
                {profileName?.trim().slice(0, 1).toUpperCase() || 'P'}
              </Text>
            </BrandAvatar>
          </MotionPressable>
        </View>
      </View>
      <ScreenHeader title={title} subtitle={subtitle} titleNumberOfLines={2} />
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back,
  onBack,
  rightAction,
  titleNumberOfLines,
  brand = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  titleNumberOfLines?: number;
  brand?: boolean;
}) {
  return (
    <View style={styles.header}>
      {back ? <IconButton name="arrow-back" accessibilityLabel="Volver" onPress={onBack} /> : null}
      {brand ? <BrandMark size={32} /> : null}
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
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </MotionPressable>
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
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.listItem, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={[typography.body, styles.grow]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  homeHeader: { gap: spacing.xs },
  brandRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  profileAction: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { ...typography.label, color: colors.primaryStrong },
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
