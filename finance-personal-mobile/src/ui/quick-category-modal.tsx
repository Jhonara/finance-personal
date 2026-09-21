import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCreateCategory } from '@/features/categories/use-categories';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { Button, Input } from './primitives';

export function QuickCategoryModal({
  visible,
  type,
  onClose,
  onCreated,
}: {
  visible: boolean;
  type: 'EXPENSE' | 'INCOME';
  onClose(): void;
  onCreated(id: number): void;
}) {
  const [name, setName] = useState('');
  const mutation = useCreateCategory();
  const feedback = useFeedback();
  const title = type === 'EXPENSE' ? 'Nueva categoría de gasto' : 'Nueva categoría de ingreso';
  const close = () => {
    if (!mutation.isPending) {
      setName('');
      onClose();
    }
  };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={typography.sectionTitle}>{title}</Text>
          <Input
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder={
              type === 'EXPENSE' ? 'Ej. Comida, Transporte, Suscripciones' : 'Ej. Nómina, Freelance'
            }
            helperText="Las categorías te ayudan a organizar mejor tus movimientos."
            autoFocus
          />
          <Button
            loading={mutation.isPending}
            disabled={!name.trim() || mutation.isPending}
            onPress={() =>
              mutation.mutate(
                { name: name.trim(), type },
                {
                  onSuccess: (category) => {
                    if (category.id !== undefined) onCreated(category.id);
                    feedback.show('Categoría creada.', 'success');
                    setName('');
                    mutation.reset();
                    onClose();
                  },
                  onError: () => feedback.show('No fue posible crear la categoría.', 'error'),
                },
              )
            }
          >
            Crear categoría
          </Button>
          <Button variant="ghost" disabled={mutation.isPending} onPress={close}>
            Cancelar
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32,45,50,0.32)' },
  sheet: {
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    backgroundColor: colors.surfaceElevated,
    ...shadows.bottomSheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
});
