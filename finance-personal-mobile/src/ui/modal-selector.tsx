import { useModalMotion } from './use-modal-motion';
import { MotionPressable } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './primitives';
export type SelectorOption = {
  id: number;
  label: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  disabled?: boolean;
};
export function ModalSelector({
  visible,
  label,
  subtitle,
  options,
  loading,
  selectedId,
  emptyActionLabel,
  emptyTitle = 'No tienes opciones disponibles',
  emptyDescription = 'Crea una opción para continuar con este movimiento.',
  onEmptyAction,
  onClose,
  onSelect,
}: {
  visible: boolean;
  label: string;
  subtitle?: string;
  options: SelectorOption[];
  loading?: boolean;
  selectedId?: number;
  emptyActionLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onEmptyAction?(): void;
  onClose(): void;
  onSelect(id: number): void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetMotion = useModalMotion(visible, onClose);
  return (
    <Modal transparent animationType="none" visible={sheetMotion.present} onRequestClose={sheetMotion.close}>
      <Animated.View style={[{ flex: 1 }, sheetMotion.overlay]}>
        <MotionPressable feedback={false} style={styles.overlay} onPress={sheetMotion.close}>
          <Animated.View style={[{ maxHeight: height - insets.top - spacing.xl }, sheetMotion.sheet]}>
            <MotionPressable
              feedback={false}
              style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.heading}>
                  <Text accessibilityRole="header" style={styles.title}>
                    {label}
                  </Text>
                  <Text style={styles.subtitle}>{subtitle ?? 'Elige una opción para continuar.'}</Text>
                </View>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar selector"
                  onPress={sheetMotion.close}
                  style={styles.close}
                >
                  <Ionicons name="close" size={20} color={colors.primaryStrong} />
                </MotionPressable>
              </View>
              {loading ? (
                <Text style={styles.loading}>Cargando opciones…</Text>
              ) : options.length ? (
                <ScrollView
                  style={styles.options}
                  contentContainerStyle={styles.optionsContent}
                  showsVerticalScrollIndicator={false}
                >
                  {options.map((o) => (
                    <MotionPressable
                      key={o.id}
                      disabled={o.disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected: o.id === selectedId, disabled: Boolean(o.disabled) }}
                      onPress={(event) => {
                        event.stopPropagation();
                        onSelect(o.id);
                        onClose();
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        o.id === selectedId && styles.optionSelected,
                        pressed && styles.optionPressed,
                        o.disabled && styles.optionDisabled,
                      ]}
                    >
                      <View
                        style={[styles.optionIcon, { backgroundColor: `${colors[o.tone ?? 'primary']}1A` }]}
                      >
                        <Ionicons
                          name={o.icon ?? 'ellipse-outline'}
                          size={20}
                          color={colors[o.tone ?? 'primary']}
                        />
                      </View>
                      <View style={styles.optionCopy}>
                        <Text
                          numberOfLines={2}
                          style={[styles.optionTitle, o.id === selectedId && styles.optionTextSelected]}
                        >
                          {o.label}
                        </Text>
                        {o.subtitle ? (
                          <Text numberOfLines={2} style={styles.optionSubtitle}>
                            {o.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name={o.id === selectedId ? 'checkmark-circle' : 'chevron-forward'}
                        size={21}
                        color={o.id === selectedId ? colors.success : colors.textMuted}
                      />
                    </MotionPressable>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={typography.cardTitle}>{emptyTitle}</Text>
                  <Text style={[typography.bodySecondary, styles.emptyText]}>{emptyDescription}</Text>
                </View>
              )}
              {emptyActionLabel && onEmptyAction ? (
                <Button variant="secondary" size="compact" onPress={onEmptyAction}>
                  {emptyActionLabel}
                </Button>
              ) : null}
            </MotionPressable>
          </Animated.View>
        </MotionPressable>
      </Animated.View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heading: { flex: 1, gap: spacing.xxs },
  title: { ...typography.sectionTitle, color: colors.primaryStrong },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  close: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  loading: { ...typography.bodySecondary, paddingVertical: spacing.lg },
  options: { flexShrink: 1 },
  optionsContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  option: {
    minHeight: 68,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceSecondary,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: { flex: 1, gap: spacing.xxs },
  optionTitle: { ...typography.label, color: colors.primaryStrong },
  optionSubtitle: { ...typography.caption, color: colors.textSecondary },
  optionSelected: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.success },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  optionPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  optionDisabled: { opacity: 0.45 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  emptyText: { textAlign: 'center' },
});
