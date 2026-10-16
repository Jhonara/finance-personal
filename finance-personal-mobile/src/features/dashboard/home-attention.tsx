import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { DashboardMonth } from '@/api/dashboard-api';
import { presentAlert } from '@/features/alerts/alert-presentation';
import { MotionPressable } from '@/ui/motion';
import { colors, radius, spacing, typography } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';

export function HomeAttention({
  alerts,
  unavailable = false,
}: {
  alerts: DashboardMonth['alerts'];
  unavailable?: boolean;
}) {
  const pending = (alerts ?? [])
    .filter((alert) => alert.code && alert.code !== 'ALL_GOOD')
    .map((alert) => presentAlert(alert))
    .filter((alert) => alert.level !== 'Información');
  if (!pending.length && !unavailable) return null;
  const priority = pending.find((alert) => alert.level === 'Importante') ?? pending[0];
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel="Ver alertas"
      onPress={() => router.push('/(app)/alerts')}
      style={styles.card}
    >
      <View style={styles.icon}>
        <Ionicons name="notifications-outline" size={21} color={colors.warning} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {unavailable
            ? 'Consulta tus alertas'
            : pending.length === 1
              ? 'Tienes un aviso por revisar'
              : `${pending.length} avisos por revisar`}
        </Text>
        <Text style={styles.description}>
          {unavailable
            ? 'No pudimos actualizar los avisos. Toca para reintentar.'
            : `${priority?.title}. Ver detalles`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.warning} />
    </MotionPressable>
  );
}

const styles = themedStyleSheet(() => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.warningSoft,
    marginBottom: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  title: { ...typography.label, color: colors.textPrimary },
  description: { ...typography.caption, color: colors.textSecondary },
}));
