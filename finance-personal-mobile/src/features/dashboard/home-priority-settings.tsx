import { useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFeedback } from '@/feedback/feedback-provider';
import { ModalSelector } from '@/ui/modal-selector';
import { MotionPressable } from '@/ui/motion';
import { SettingsRow } from '@/ui/settings-row';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { homePriorities } from './home-priority';
import { useHomePriority } from './use-home-priority';

export function HomePrioritySettings({ userId, compact = false }: { userId?: number; compact?: boolean }) {
  const preference = useHomePriority(userId);
  const feedback = useFeedback();
  const [openForUser, setOpenForUser] = useState<number>();
  const selected = homePriorities.find((option) => option.value === preference.priority)!;
  const label = preference.saving
    ? 'Guardando…'
    : preference.error
      ? 'Reintentar personalización'
      : preference.loading
        ? 'Cargando…'
        : selected.label;
  const disabled = preference.saving || (!preference.ready && !preference.error);
  const onPress = () => {
    if (preference.error) void preference.retry();
    else setOpenForUser(userId);
  };
  return (
    <>
      {compact ? (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Personalizar Inicio"
          accessibilityHint={label}
          disabled={disabled}
          onPress={onPress}
          style={styles.compact}
        >
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <View style={styles.copy}>
            <Text style={styles.caption}>TU INICIO</Text>
            <Text style={styles.label}>{label}</Text>
          </View>
          <Text style={styles.change}>Cambiar</Text>
        </MotionPressable>
      ) : (
        <SettingsRow
          icon="options-outline"
          title="Personalizar Inicio"
          subtitle={`${label}. Elige qué quieres destacar.`}
          disabled={disabled}
          onPress={onPress}
        />
      )}
      <ModalSelector
        visible={openForUser !== undefined && openForUser === userId}
        label="¿Qué quieres priorizar?"
        subtitle="Ordena tus accesos y destaca un resumen útil. Se guarda para tu perfil en este dispositivo; puedes cambiarlo cuando quieras."
        options={homePriorities.map((option) => ({ ...option, disabled: preference.saving }))}
        selectedId={selected.id}
        onClose={() => setOpenForUser(undefined)}
        onSelect={(id) => {
          const option = homePriorities.find((item) => item.id === id);
          if (!option) return;
          void preference
            .change(option.value)
            .then((saved) => {
              if (saved)
                feedback.show(
                  option.value === 'general'
                    ? 'Inicio volvió a la vista general.'
                    : `Inicio personalizado: ${option.label.toLowerCase()}.`,
                  'success',
                );
            })
            .catch(() =>
              feedback.show(
                'No pudimos guardar tu preferencia. Se mantiene tu Inicio anterior; vuelve a intentarlo.',
                'error',
              ),
            );
        }}
      />
    </>
  );
}

const styles = themedStyleSheet(() => ({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.medium,
    backgroundColor: colors.surfaceSecondary,
  },
  copy: { flex: 1, minWidth: 0 },
  caption: {
    ...typography.caption,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSecondary,
  },
  label: { ...typography.label, fontSize: 12, lineHeight: 17, color: colors.textPrimary },
  change: { ...typography.caption, fontWeight: '600', color: colors.primary },
}));
