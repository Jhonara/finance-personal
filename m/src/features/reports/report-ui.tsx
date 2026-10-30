import type { PropsWithChildren, ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { Card, Button } from '@/ui/primitives';
import { MotionPressable } from '@/ui/motion';

export const reportStyles = themedStyleSheet(() => ({
  panel: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  between: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  stack: { gap: spacing.md },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { ...typography.sectionTitle, color: colors.textPrimary, flexShrink: 1 },
  label: { ...typography.label, color: colors.textPrimary },
  body: { ...typography.bodySecondary, color: colors.textSecondary },
  caption: { ...typography.caption, color: colors.textSecondary },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.success,
  },
  value: { ...typography.moneyLarge, fontSize: 27, lineHeight: 34, color: colors.textPrimary },
  amount: { ...typography.cardTitle, color: colors.textPrimary, flexShrink: 1 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  note: {
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.infoSoft,
    gap: spacing.xs,
  },
  item: { paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.divider, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: { backgroundColor: colors.primarySoft, borderColor: colors.success },
  selectedText: { ...typography.caption, fontWeight: '700', color: colors.primary },
  dot: { width: 9, height: 9, borderRadius: 5 },
}));

export function ReportPanel({
  title,
  subtitle,
  icon,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; icon: ComponentProps<typeof Ionicons>['name'] }>) {
  return (
    <Card style={reportStyles.panel}>
      <View style={reportStyles.row}>
        <View style={reportStyles.icon}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={reportStyles.copy}>
          <Text accessibilityRole="header" style={reportStyles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={reportStyles.caption}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}
export function ReportNotice({ children }: PropsWithChildren) {
  return (
    <View style={reportStyles.note}>
      <Text style={reportStyles.caption}>{children}</Text>
    </View>
  );
}
export function ReportEmpty({
  title,
  children,
  action,
  onPress,
}: PropsWithChildren<{ title: string; action?: string; onPress?: () => void }>) {
  return (
    <View style={reportStyles.stack}>
      <Text style={reportStyles.label}>{title}</Text>
      <Text style={reportStyles.body}>{children}</Text>
      {action && onPress ? (
        <Button variant="secondary" onPress={onPress}>
          {action}
        </Button>
      ) : null}
    </View>
  );
}
export function ReportChoice<T extends string | number>({
  choices,
  selected,
  onSelect,
  label,
}: {
  choices: readonly { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  label: string;
}) {
  return (
    <View style={reportStyles.chips}>
      {choices.map((choice) => (
        <MotionPressable
          key={choice.value}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${choice.label}`}
          accessibilityState={{ selected: choice.value === selected }}
          onPress={() => onSelect(choice.value)}
          style={[reportStyles.chip, choice.value === selected && reportStyles.selectedChip]}
        >
          <Text style={choice.value === selected ? reportStyles.selectedText : reportStyles.caption}>
            {choice.label}
          </Text>
        </MotionPressable>
      ))}
    </View>
  );
}
