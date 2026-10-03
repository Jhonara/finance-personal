import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { BrandSurface } from '@/ui/brand-surface';
import { FinancialCompanion } from '@/ui/brand-identity';
import { Button } from '@/ui/primitives';
import { MotionPressable } from '@/ui/motion';

export function EmptyHome({ onCreateAccount }: { onCreateAccount(): void }) {
  return (
    <BrandSurface tone="panorama" style={styles.emptyHero}>
      <View style={styles.emptyTop}>
        <Text style={styles.eyebrow}>EMPECEMOS JUNTOS</Text>
        <FinancialCompanion state="happy" size={72} />
      </View>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        Tu dinero empieza aquí.
      </Text>
      <Text style={styles.emptyCopy}>
        Crea tu primera cuenta para registrar movimientos y empezar a ver tu panorama.
      </Text>
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Crear mi primera cuenta"
        onPress={onCreateAccount}
        style={styles.emptyAction}
      >
        <Text style={styles.emptyActionText}>Crear mi primera cuenta</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.primaryStrong} />
      </MotionPressable>
    </BrandSurface>
  );
}

export function FirstMovementPrompt({ onRegister }: { onRegister(): void }) {
  return (
    <BrandSurface tone="insight" style={styles.prompt}>
      <FinancialCompanion state="thinking" size={48} />
      <View style={styles.promptText}>
        <Text accessibilityRole="header" style={typography.cardTitle}>
          Tu panorama ya está tomando forma
        </Text>
        <Text style={typography.bodySecondary}>
          Registra tu primer movimiento para ver cómo cambia tu mes.
        </Text>
      </View>
      <Button accessibilityLabel="Registrar mi primer movimiento" onPress={onRegister}>
        Registrar mi primer movimiento
      </Button>
    </BrandSurface>
  );
}

export function QuietMonthNotice({
  currencyUnavailable,
  onMovements,
}: {
  currencyUnavailable: boolean;
  onMovements(): void;
}) {
  return (
    <BrandSurface tone="insight" style={styles.quiet}>
      <View style={styles.quietIcon}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.promptText}>
        <Text style={typography.cardTitle}>
          {currencyUnavailable
            ? 'Revisa tus movimientos por moneda'
            : 'Este mes aún no tiene ingresos ni gastos'}
        </Text>
        <Text style={typography.bodySecondary}>
          {currencyUnavailable
            ? 'Consulta los movimientos para ver cada importe en su moneda.'
            : 'Cuando registres actividad, verás aquí el resumen del mes.'}
        </Text>
      </View>
      <Button variant="secondary" onPress={onMovements}>
        Ver movimientos
      </Button>
    </BrandSurface>
  );
}

const styles = StyleSheet.create({
  emptyHero: { gap: spacing.lg, padding: spacing.xxl, marginTop: spacing.lg },
  emptyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { ...typography.label, color: colors.secondary, letterSpacing: 0.7 },
  emptyTitle: { ...typography.display, color: colors.surface, maxWidth: 250 },
  emptyCopy: { ...typography.bodySecondary, color: colors.infoSoft },
  emptyAction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  emptyActionText: { ...typography.button, color: colors.primaryStrong },
  prompt: { gap: spacing.md, marginTop: spacing.xl },
  promptText: { gap: spacing.xs },
  quiet: { gap: spacing.md, marginTop: spacing.xl },
  quietIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
