import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { Button } from './primitives';
export type SelectorOption = {
  id: number;
  label: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
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
  onEmptyAction?(): void;
  onClose(): void;
  onSelect(id: number): void;
}) {
  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
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
                      {o.icon ? <Ionicons name={o.icon} size={20} color={colors.primary} /> : null}
                      <Text style={[typography.body, o.id === selectedId && styles.optionTextSelected]}>
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
              <Text style={typography.cardTitle}>No tienes opciones disponibles</Text>
              <Text style={[typography.bodySecondary, styles.emptyText]}>
                Crea una opción para continuar con este movimiento.
              </Text>
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
