import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
      <Text style={typography.sectionTitle}>{title}</Text>
      <Text style={[typography.bodySecondary, styles.centerText]}>{description}</Text>
      {actionLabel && (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

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
    gap: spacing.sm,
    padding: spacing.xxxl,
    borderRadius: radius.large,
    backgroundColor: colors.surfaceSecondary,
  },
  centerText: { textAlign: 'center' },
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
