import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/ui/brand-media';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MotionEntry, MotionPressable } from './motion';

type MovementTone = 'expense' | 'income' | 'transfer';

const tone = {
  expense: { icon: 'bag-handle-outline', ink: colors.danger, soft: '#FFEAE8', end: '#FFF9F8' },
  income: { icon: 'trending-up-outline', ink: colors.success, soft: '#DDF9ED', end: '#F8FFFC' },
  transfer: { icon: 'swap-horizontal-outline', ink: colors.info, soft: '#DDF4FC', end: '#F8FDFF' },
} as const;

export function MovementFormHeader({ title, onBack }: { title: string; onBack(): void }) {
  return (
    <View style={styles.header}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack}
        style={styles.back}
      >
        <Ionicons name="arrow-back" size={22} color={colors.primaryStrong} />
      </MotionPressable>
      <BrandMark size={31} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.headerTitle}>
        {title}
      </Text>
    </View>
  );
}

export function MovementFormIntro({
  kind,
  title,
  description,
}: {
  kind: MovementTone;
  title: string;
  description: string;
}) {
  const appearance = tone[kind];
  return (
    <LinearGradient colors={[appearance.soft, appearance.end]} style={styles.intro}>
      <View style={[styles.introIcon, { backgroundColor: appearance.soft }]}>
        <Ionicons name={appearance.icon} size={24} color={appearance.ink} />
      </View>
      <View style={styles.introCopy}>
        <Text accessibilityRole="header" style={styles.introTitle}>
          {title}
        </Text>
        <Text style={styles.introDescription}>{description}</Text>
      </View>
    </LinearGradient>
  );
}

export function MovementFormSection({
  title,
  subtitle,
  icon,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
}>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={19} color={colors.primary} />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.fields}>{children}</View>
    </View>
  );
}

export function MovementAmountPanel({ kind, children }: PropsWithChildren<{ kind: MovementTone }>) {
  return (
    <View style={[styles.amountPanel, { borderColor: tone[kind].soft, backgroundColor: tone[kind].end }]}>
      {children}
    </View>
  );
}

export function MovementOptionalDetails({
  open,
  onToggle,
  children,
}: PropsWithChildren<{ open: boolean; onToggle(): void }>) {
  return (
    <View style={styles.optional}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Ocultar detalles opcionales' : 'Añadir detalles opcionales'}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={styles.optionalButton}
      >
        <View style={styles.optionalIcon}>
          <Ionicons name="options-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{open ? 'Detalles opcionales' : 'Añadir detalles'}</Text>
          <Text style={styles.sectionSubtitle}>Fecha o nota</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={19} color={colors.primary} />
      </MotionPressable>
      {open ? <MotionEntry revision="details">{children}</MotionEntry> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  headerTitle: { ...typography.cardTitle, flex: 1, color: colors.primaryStrong },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
  },
  introIcon: {
    width: 49,
    height: 49,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, gap: spacing.xs },
  introTitle: { ...typography.sectionTitle, fontSize: 18, lineHeight: 24 },
  introDescription: { ...typography.caption, color: colors.textSecondary },
  section: {
    gap: spacing.md,
    borderRadius: radius.large,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCopy: { flex: 1, gap: spacing.xxs },
  sectionTitle: { ...typography.cardTitle, fontSize: 14, lineHeight: 19 },
  sectionSubtitle: { ...typography.caption, lineHeight: 16 },
  fields: { gap: spacing.md },
  amountPanel: { borderWidth: 1, borderRadius: radius.large, padding: spacing.md },
  optional: { gap: spacing.sm },
  optionalButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.infoSoft,
  },
  optionalIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
