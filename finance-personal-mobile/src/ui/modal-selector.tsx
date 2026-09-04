import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
export type SelectorOption = { id: number; label: string; disabled?: boolean };
export function ModalSelector({
  visible,
  label,
  options,
  loading,
  emptyActionLabel,
  onEmptyAction,
  onClose,
  onSelect,
}: {
  visible: boolean;
  label: string;
  options: SelectorOption[];
  loading?: boolean;
  emptyActionLabel?: string;
  onEmptyAction?(): void;
  onClose(): void;
  onSelect(id: number): void;
}) {
  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={typography.sectionTitle}>{label}</Text>
          {loading ? (
            <Text>Cargando…</Text>
          ) : options.length ? (
            <ScrollView style={styles.options}>
              {options.map((o) => (
                <Pressable
                  key={o.id}
                  disabled={o.disabled}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(o.id);
                    onClose();
                  }}
                >
                  <Text>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View>
              <Text>No tienes opciones disponibles.</Text>
              {emptyActionLabel && onEmptyAction && (
                <Pressable accessibilityRole="button" onPress={onEmptyAction}>
                  <Text>{emptyActionLabel}</Text>
                </Pressable>
              )}
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
            <Text>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(30,42,49,0.32)' },
  sheet: {
    maxHeight: '80%',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  options: { maxHeight: 360 },
  cancel: { alignItems: 'center', padding: spacing.md },
});
