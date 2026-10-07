import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from '@/ui/motion';
import { colors, spacing, typography } from '@/theme';

export function CreditEntryCard({ summary }: { summary?: string }) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel="Ver créditos"
      accessibilityHint="Préstamos, pagos y simulación de abonos"
      onPress={() => router.push('/(app)/credits')}
    >
      <LinearGradient colors={[colors.primaryStrong, '#214E60']} style={styles.card}>
        <View style={styles.top}>
          <View style={styles.icon}>
            <Ionicons name="card-outline" size={27} color={colors.mint} />
          </View>
          <Text style={styles.badge}>{summary ?? 'TU PLAN DE PAGOS'}</Text>
          <Ionicons name="arrow-forward" size={22} color={colors.surface} />
        </View>
        <Text style={styles.title}>Créditos y préstamos</Text>
        <Text style={styles.copy}>
          Tu casa, vehículo u otro préstamo. Revisa pagos y prueba abonos para entender tu deuda.
        </Text>
        <View style={styles.footer}>
          <Ionicons name="calculator-outline" size={18} color={colors.mint} />
          <Text style={styles.link}>Pagos · Amortización · Abonos</Text>
        </View>
      </LinearGradient>
    </MotionPressable>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: spacing.lg, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { ...typography.caption, color: '#C2EEE5', flex: 1, fontWeight: '600' },
  title: { ...typography.sectionTitle, color: colors.surface },
  copy: { ...typography.caption, color: '#D8EAE9' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#FFFFFF20',
    marginTop: spacing.xs,
  },
  link: { ...typography.caption, color: colors.mint, fontWeight: '600', flexShrink: 1 },
});
