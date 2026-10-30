import { useState, type PropsWithChildren, type ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { MotionEntry, MotionPressable } from './motion';

export function Disclosure({
  title,
  children,
  icon = 'information-circle-outline',
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: PropsWithChildren<{
  title: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>) {
  const [localOpen, setOpen] = useState(defaultOpen);
  const open = controlledOpen ?? localOpen;
  return (
    <View style={styles.container}>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setOpen(!open);
          onOpenChange?.(!open);
        }}
        style={styles.toggle}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
        <Text style={styles.title}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textMuted} />
      </MotionPressable>
      {open ? (
        <MotionEntry>
          <View style={styles.content}>{children}</View>
        </MotionEntry>
      ) : null}
    </View>
  );
}
const styles = themedStyleSheet(() => ({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  toggle: { minHeight: 48, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.label, color: colors.primary, flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md },
}));
