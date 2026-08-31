import { Modal, Pressable, Text, View } from 'react-native';
export type SelectorOption = { id: number; label: string; disabled?: boolean };
export function ModalSelector({
  visible,
  label,
  options,
  loading,
  onClose,
  onSelect,
}: {
  visible: boolean;
  label: string;
  options: SelectorOption[];
  loading?: boolean;
  onClose(): void;
  onSelect(id: number): void;
}) {
  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <View>
        <Text>{label}</Text>
        {loading ? (
          <Text>Cargando…</Text>
        ) : options.length ? (
          options.map((o) => (
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
          ))
        ) : (
          <Text>No tienes opciones disponibles.</Text>
        )}
        <Pressable accessibilityRole="button" onPress={onClose}>
          <Text>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
