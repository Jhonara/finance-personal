import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateCategory } from '@/features/categories/use-categories';
import { useFeedback } from '@/feedback/feedback-provider';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MotionModal as Modal } from './motion-modal';
import { MotionPressable } from './motion';
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
  const [nameError, setNameError] = useState('');
  const submitting = useRef(false);
  const insets = useSafeAreaInsets();
  const mutation = useCreateCategory();
  const feedback = useFeedback();
  const title = type === 'EXPENSE' ? 'Nueva categoría de gasto' : 'Nueva categoría de ingreso';
  const close = () => {
    if (!mutation.isPending) {
      setName('');
      setNameError('');
      onClose();
    }
  };
  return (
    <Modal transparent visible={visible} onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} />
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.icon}>
              <Ionicons name="pricetag-outline" size={23} color={colors.success} />
            </View>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={typography.sectionTitle}>
                {title}
              </Text>
              <Text style={typography.caption}>Organiza mejor este movimiento.</Text>
            </View>
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={close}
              style={styles.close}
            >
              <Ionicons name="close" size={20} color={colors.primaryStrong} />
            </MotionPressable>
          </View>
          <Input
            label="Nombre de la categoría"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setNameError('');
            }}
            placeholder={type === 'EXPENSE' ? 'Ej. Comida o transporte' : 'Ej. Nómina o freelance'}
            helperText="Podrás usarla en tus próximos movimientos."
            maxLength={100}
            error={nameError}
          />
          <Button
            loading={mutation.isPending}
            disabled={mutation.isPending}
            onPress={() => {
              if (submitting.current) return;
              if (!name.trim()) {
                setNameError('Escribe un nombre para continuar.');
                return;
              }
              submitting.current = true;
              mutation.mutate(
                { name: name.trim(), type },
                {
                  onSuccess: (category) => {
                    if (category.id !== undefined) onCreated(category.id);
                    feedback.show('Categoría creada.', 'success');
                    setName('');
                    setNameError('');
                    mutation.reset();
                    onClose();
                  },
                  onError: () => feedback.show('No fue posible crear la categoría.', 'error'),
                  onSettled: () => {
                    submitting.current = false;
                  },
                },
              );
            }}
          >
            Crear categoría
          </Button>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.overlay },
  sheet: {
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surfaceElevated,
    ...shadows.bottomSheet,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { flex: 1, gap: spacing.xxs },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  close: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
});
