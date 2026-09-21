import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={typography.sectionTitle}>{label}</Text>
          {subtitle ? <Text style={typography.bodySecondary}>{subtitle}</Text> : null}
          {loading ? (
            <Text style={typography.bodySecondary}>Cargando opciones…</Text>
          ) : options.length ? (
            <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent}>
              {options.map((o) => (
                <Pressable
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
                  <View style={styles.optionCopy}>
                    <View style={styles.optionLabel}>
                      {o.icon ? (
                        <Ionicons name={o.icon} size={20} color={colors[o.tone ?? 'primary']} />
                      ) : null}
                      <Text
                        style={[
                          typography.body,
                          { flexShrink: 1 },
                          o.id === selectedId && styles.optionTextSelected,
                        ]}
                      >
                        {o.label}
                      </Text>
                    </View>
                    {o.subtitle ? <Text style={typography.caption}>{o.subtitle}</Text> : null}
                  </View>
                  {o.id === selectedId && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
              </View>
              <Text style={typography.cardTitle}>{emptyTitle}</Text>
              <Text style={[typography.bodySecondary, styles.emptyText]}>{emptyDescription}</Text>
              {emptyActionLabel && onEmptyAction && (
                <Button variant="secondary" size="compact" onPress={onEmptyAction}>
                  {emptyActionLabel}
                </Button>
              )}
            </View>
          )}
          <Button variant="ghost" size="compact" onPress={onClose}>
            Cancelar
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(30,42,49,0.32)' },
  sheet: {
    maxHeight: '86%',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  options: { maxHeight: 360 },
  optionsContent: { gap: spacing.sm },
  option: {
    minHeight: 52,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceSecondary,
  },
  optionCopy: { flex: 1, gap: spacing.xxs },
  optionLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionSelected: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
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
