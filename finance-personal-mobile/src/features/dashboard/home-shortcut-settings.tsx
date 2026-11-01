import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, typography } from '@/theme';
import { Button } from '@/ui/primitives';
import { MotionPressable } from '@/ui/motion';
import { useFeedback } from '@/feedback/feedback-provider';
import { homeShortcutOptions } from './shortcut-preferences';
import { useHomeShortcuts } from './use-home-shortcuts';
import { useHomePriority } from './use-home-priority';

export function HomeShortcutSettings({ userId }: { userId?: number }) {
  const priority = useHomePriority(userId);
  const preferences = useHomeShortcuts(userId, priority.priority);
  const feedback = useFeedback();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.cardTitle}>Tus accesos rápidos</Text>
      <Text style={typography.caption}>
        Elige de uno a cuatro. Se guardan para tu usuario en este dispositivo.
      </Text>
      {preferences.error ? (
        <Button variant="ghost" onPress={() => void preferences.retry()}>
          Reintentar accesos
        </Button>
      ) : null}
      {homeShortcutOptions.map((option) => {
        const checked = preferences.selected.includes(option.key);
        return (
          <MotionPressable
            key={option.key}
            accessibilityRole="checkbox"
            accessibilityLabel={option.title}
            accessibilityState={{ checked, disabled: !preferences.ready || preferences.saving }}
            disabled={!preferences.ready || preferences.saving}
            style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            onPress={() => {
              if (
                (!checked && preferences.selected.length === 4) ||
                (checked && preferences.selected.length === 1)
              ) {
                feedback.show('Selecciona entre uno y cuatro accesos.', 'info');
                return;
              }
              const next = checked
                ? preferences.selected.filter((key) => key !== option.key)
                : [...preferences.selected, option.key];
              void preferences
                .change(next)
                .catch(() =>
                  feedback.show(
                    'No pudimos guardar tus accesos. Conservamos la selección anterior.',
                    'error',
                  ),
                );
            }}
          >
            <Ionicons name={option.icon} size={20} color={colors.primary} />
            <Text style={[typography.body, { flex: 1 }]}>{option.title}</Text>
            <Ionicons
              name={checked ? 'checkbox' : 'square-outline'}
              size={24}
              color={checked ? colors.primary : colors.textMuted}
            />
          </MotionPressable>
        );
      })}
    </View>
  );
}
