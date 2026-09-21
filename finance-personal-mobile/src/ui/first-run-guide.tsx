import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { firstRunStorage } from '@/features/onboarding/first-run-storage';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { Button } from './primitives';

const slides = [
  {
    icon: 'wallet-outline',
    title: 'Tu dinero, en un solo lugar',
    copy: 'Organiza cuentas, movimientos, presupuestos, ahorros y créditos desde una misma app.',
  },
  {
    icon: 'compass-outline',
    title: 'Empieza con lo que tienes hoy',
    copy: 'Crea una cuenta y registra tu saldo actual. Desde ahí podrás llevar el resto de tus movimientos.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Construye mejores hábitos',
    copy: 'Registra tus movimientos, controla tus presupuestos y sigue tu progreso financiero.',
  },
] as const;

export function FirstRunGuide({
  userId,
  replay = false,
  onClose,
}: {
  userId?: number;
  replay?: boolean;
  onClose?: () => void;
}) {
  const [visible, setVisible] = useState(replay);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (replay || !userId) return;
    let active = true;
    setSlide(0);
    void firstRunStorage
      .read(firstRunStorage.introKey(userId))
      .then((value) => {
        if (active) setVisible(value !== 'done');
      })
      .catch(() => setVisible(false));
    return () => {
      active = false;
    };
  }, [userId, replay]);
  const close = () => {
    setVisible(false);
    if (!replay && userId) void firstRunStorage.mark(firstRunStorage.introKey(userId));
    onClose?.();
  };
  const current = slides[slide] ?? slides[0]!;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.card}>
          <ScrollView contentContainerStyle={{ gap: spacing.md }}>
            <View style={styles.icon}>
              <Ionicons name={current.icon} size={28} color={colors.primary} />
            </View>
            <Text style={typography.sectionTitle}>{current.title}</Text>
            <Text style={[typography.bodySecondary, styles.copy]}>{current.copy}</Text>
            <View accessibilityLabel={`Paso ${slide + 1} de ${slides.length}`} style={styles.dots}>
              {slides.map((item, index) => (
                <View key={item.title} style={[styles.dot, index === slide && styles.dotActive]} />
              ))}
            </View>
            <Button onPress={slide === slides.length - 1 ? close : () => setSlide((value) => value + 1)}>
              {slide === slides.length - 1 ? (replay ? 'Listo' : 'Empezar') : 'Continuar'}
            </Button>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Omitir introducción"
              onPress={close}
              style={styles.skip}
            >
              <Text style={styles.skipText}>Omitir</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function FirstRunFabHint({
  userId,
  visible,
  onDismiss,
}: {
  userId?: number;
  visible: boolean;
  onDismiss(): void;
}) {
  const dismiss = () => {
    onDismiss();
    if (userId) void firstRunStorage.mark(firstRunStorage.hintKey(userId, 'fab'));
  };
  if (!visible) return null;
  return (
    <View accessibilityLiveRegion="polite" style={styles.hint}>
      <Text style={typography.cardTitle}>Registra tu primer movimiento</Text>
      <Text style={typography.caption}>Usa el botón + para añadir un ingreso, gasto o transferencia.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar ayuda de movimientos"
        onPress={dismiss}
      >
        <Text style={styles.skipText}>Entendido</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(32,45,50,0.38)' },
  card: {
    maxHeight: '90%',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    ...shadows.bottomSheet,
  },
  icon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  copy: { minHeight: 66 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 20, backgroundColor: colors.primary },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { ...typography.label, color: colors.primary },
  hint: {
    position: 'absolute',
    right: spacing.xl,
    bottom: 88,
    maxWidth: 245,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceElevated,
    ...shadows.floating,
  },
});
