import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { Button } from './primitives';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  tone = 'neutral',
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'primary' | 'warning' | 'info' | 'neutral';
}) {
  const presentation = emptyTone[tone];
  return (
    <View style={[styles.center, { backgroundColor: presentation.backgroundColor }]}>
      <Ionicons name={presentation.icon} size={28} color={presentation.color} />
      <Text style={[typography.sectionTitle, styles.centerTitle]}>{title}</Text>
      <Text style={[typography.bodySecondary, styles.centerText]}>{description}</Text>
      {actionLabel && (
        <View style={styles.emptyAction}>
          <Button
            variant="secondary"
            tone={presentation.buttonTone}
            size="compact"
            accessibilityLabel={actionLabel}
            onPress={onAction}
          >
            {actionLabel}
          </Button>
        </View>
      )}
    </View>
  );
}

const emptyTone = {
  primary: { backgroundColor: colors.primarySoft, color: colors.primary, icon: 'wallet-outline', buttonTone: 'primary' },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning, icon: 'pie-chart-outline', buttonTone: 'warning' },
  info: { backgroundColor: colors.infoSoft, color: colors.info, icon: 'swap-horizontal-outline', buttonTone: 'info' },
  neutral: { backgroundColor: colors.surfaceSecondary, color: colors.primary, icon: 'sparkles-outline', buttonTone: 'primary' },
} as const;

export function ErrorState({
  title = 'No fue posible cargar esta información',
  message = 'Revisa tu conexión e inténtalo nuevamente.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={[styles.center, styles.error]}>
      <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
      <Text style={typography.sectionTitle}>{title}</Text>
      <Text style={[typography.bodySecondary, styles.centerText]}>{message}</Text>
      {onRetry && (
        <Pressable accessibilityRole="button" accessibilityLabel="Reintentar" onPress={onRetry}>
          <Text style={[styles.action, { color: colors.danger }]}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Skeleton({
  width = '100%',
  height = 16,
}: {
  width?: number | `${number}%`;
  height?: number;
}) {
  return <View accessibilityLabel="Cargando" style={[styles.skeleton, { width, height }]} />;
}
export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton width="45%" />
      <Skeleton width="70%" height={24} />
      <Skeleton width="55%" />
    </View>
  );
}
export function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <Skeleton width={40} height={40} />
      <View style={styles.skeletonText}>
        <Skeleton width="60%" />
        <Skeleton width="42%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    borderRadius: radius.large,
    backgroundColor: colors.surfaceSecondary,
  },
  centerText: { textAlign: 'center' },
  centerTitle: { textAlign: 'center' },
  emptyAction: { marginTop: spacing.sm },
  error: { borderWidth: 1, borderColor: colors.dangerSoft },
  action: { ...typography.label, color: colors.primary, marginTop: spacing.xs },
  skeleton: { borderRadius: radius.small, backgroundColor: colors.surfaceSecondary },
  skeletonCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  skeletonText: { flex: 1, gap: spacing.sm },
});
