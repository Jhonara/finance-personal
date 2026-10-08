import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { categoryAppearance, categorySuggestions } from '@/features/categories/category-appearance';
import { colors, radius, spacing, typography } from '@/theme';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { Button, Screen } from '@/ui/primitives';

const modules = [
  {
    title: 'Categorías',
    icon: 'shapes-outline',
    color: colors.success,
    soft: colors.successSoft,
    copy: 'Elige cómo reconocer tus ingresos y gastos. Crea solo las categorías que necesites.',
    detail: 'Al empezar podrás elegir ideas o personalizar nombre, ícono y color.',
  },
  {
    title: 'Cuentas',
    icon: 'wallet-outline',
    color: colors.info,
    soft: colors.infoSoft,
    copy: 'Reúne tu banco, efectivo y billeteras para saber dónde está tu dinero.',
    detail: 'Registra tu saldo inicial cuando quieras. La app no inventará movimientos.',
  },
  {
    title: 'Movimientos',
    icon: 'swap-horizontal-outline',
    color: colors.accent,
    soft: colors.accentSoft,
    copy: 'Anota ingresos, gastos y transferencias en la cuenta que corresponda.',
    detail: 'Podrás consultar el historial y filtrar por fecha, cuenta o categoría.',
  },
  {
    title: 'Metas',
    icon: 'flag-outline',
    color: colors.success,
    soft: colors.primarySoft,
    copy: 'Ponle nombre a lo que quieres lograr y sigue tus aportes reales.',
    detail: 'Cada meta muestra lo ahorrado, lo que falta y el avance hacia tu objetivo.',
  },
  {
    title: 'Presupuestos',
    icon: 'pie-chart-outline',
    color: colors.danger,
    soft: colors.dangerSoft,
    copy: 'Define un límite mensual para una categoría y sigue cuánto has utilizado.',
    detail: 'Verás el gasto real frente al límite. Crear un presupuesto no mueve dinero.',
  },
  {
    title: 'Créditos',
    icon: 'card-outline',
    color: colors.credit,
    soft: colors.creditSoft,
    copy: 'Sigue tus préstamos desde el saldo real y revisa sus próximas cuotas.',
    detail: 'La amortización y los abonos son simulaciones hasta que registres un pago.',
  },
  {
    title: 'Panorama',
    icon: 'stats-chart-outline',
    color: colors.primary,
    soft: colors.primarySoft,
    copy: 'Consulta tus balances, avances y avisos desde Inicio y Tu plan.',
    detail: 'Los importes provienen de tus registros. Puedes ocultarlos con el modo de privacidad.',
  },
] as const;

export default function ExploreScreen() {
  const [selected, setSelected] = useState(0);
  const module = modules[selected]!;
  return (
    <Screen scroll entry style={styles.screen}>
      <View style={styles.top}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </MotionPressable>
        <Text style={typography.label}>VISTA PREVIA · SIN CUENTA</Text>
      </View>
      <Text accessibilityRole="header" style={typography.display}>
        Explora a tu ritmo
      </Text>
      <Text style={typography.bodySecondary}>
        Conoce los espacios de Finance Personal antes de registrarte. Aquí todavía no se guardan datos.
      </Text>
      <View style={styles.modules}>
        {modules.map((item, index) => (
          <MotionPressable
            key={item.title}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === index }}
            accessibilityLabel={`Explorar ${item.title}`}
            onPress={() => setSelected(index)}
            style={[
              styles.moduleTab,
              selected === index && { borderColor: item.color, backgroundColor: item.soft },
            ]}
          >
            <Ionicons name={item.icon} size={22} color={item.color} />
            <Text style={typography.label}>{item.title}</Text>
          </MotionPressable>
        ))}
      </View>
      <MotionEntry revision={selected} style={[styles.preview, { backgroundColor: module.soft }]}>
        <View style={[styles.previewIcon, { borderColor: module.color }]}>
          <Ionicons name={module.icon} size={44} color={module.color} />
        </View>
        <Text style={[typography.sectionTitle, { color: module.color }]}>{module.title}</Text>
        <Text style={typography.body}>{module.copy}</Text>
        <View style={styles.detail}>
          <Ionicons name="sparkles-outline" size={21} color={module.color} />
          <Text style={[typography.bodySecondary, { flex: 1 }]}>{module.detail}</Text>
        </View>
        {selected === 0 && (
          <View style={styles.categoryIdeas}>
            {categorySuggestions.EXPENSE.slice(0, 3).map((name) => {
              const look = categoryAppearance(name);
              return (
                <View key={name} style={[styles.idea, { backgroundColor: look.soft }]}>
                  <Ionicons name={look.icon} size={22} color={look.ink} />
                  <Text style={[typography.caption, { color: look.ink }]}>{name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </MotionEntry>
      <Button onPress={() => router.push('/(auth)/register')}>Crear mi cuenta</Button>
      <Link href="/(auth)/login" style={styles.login}>
        Ya tengo cuenta · Iniciar sesión
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  modules: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  moduleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 43,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  preview: { gap: spacing.md, borderRadius: 28, padding: spacing.xl, minHeight: 290 },
  previewIcon: {
    width: 78,
    height: 78,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  detail: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  categoryIdeas: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  idea: {
    padding: spacing.sm,
    borderRadius: radius.medium,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 78,
  },
  login: { ...typography.label, textAlign: 'center', color: colors.primary, padding: spacing.md },
});
