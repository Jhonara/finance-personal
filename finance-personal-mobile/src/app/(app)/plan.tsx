import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { homePlan } from '@/features/dashboard/home-plan';
import { CreditEntryCard } from '@/features/credits/credit-entry-card';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { Screen, Button } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { SettingsRow } from '@/ui/settings-row';
import { colors, radius, spacing, typography } from '@/theme';

export default function PlanScreen() {
  const [period] = useState(currentDashboardPeriod);
  const dashboard = useDashboardMonth(period);
  const summary = dashboard.data ? homePlan(dashboard.data, period) : undefined;
  const destinations = [
    {
      title: 'Presupuestos',
      subtitle: 'Pon un límite a tus gastos del mes.',
      summary: summary?.budget,
      icon: 'pie-chart-outline',
      tone: colors.coralSoft,
      color: colors.expense,
      route: '/(app)/budgets',
    },
    {
      title: 'Ahorros y metas',
      subtitle: 'Separa dinero para lo que quieres lograr.',
      summary: summary?.saving,
      icon: 'flag-outline',
      tone: colors.successSoft,
      color: colors.success,
      route: '/(app)/savings',
    },
    {
      title: 'Alertas',
      subtitle: 'Revisa los avisos de tus finanzas.',
      summary: summary?.alerts,
      icon: summary?.alertState === 'clear' ? 'checkmark-circle-outline' : 'notifications-outline',
      tone: summary?.alertState === 'clear' ? colors.successSoft : colors.infoSoft,
      color: colors.info,
      route: '/(app)/alerts',
    },
  ] as const;
  return (
    <Screen scroll refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <View style={styles.content}>
        <ScreenHeader title="Tu plan" subtitle="Ahorra, organiza y entiende tus deudas." />
        <MotionEntry>
          <CreditEntryCard summary={summary?.credit} />
        </MotionEntry>
        <Text accessibilityRole="header" style={typography.sectionTitle}>
          Dale un propósito a tu dinero
        </Text>
        {destinations.map((item) => (
          <MotionPressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${item.title.toLowerCase()}`}
            onPress={() =>
              router.push(
                item.route === '/(app)/budgets' ? { pathname: item.route, params: period } : item.route,
              )
            }
            style={styles.module}
          >
            <View style={[styles.icon, { backgroundColor: item.tone }]}>
              <Ionicons name={item.icon} size={27} color={item.color} />
            </View>
            <View style={styles.grow}>
              <Text style={typography.cardTitle}>{item.title}</Text>
              <Text style={typography.caption}>{item.subtitle}</Text>
              {item.summary && <Text style={styles.summary}>{item.summary}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </MotionPressable>
        ))}
        {dashboard.isError && (
          <>
            <Text style={typography.caption}>
              No pudimos actualizar los resúmenes. Puedes abrir cada módulo para consultarlo.
            </Text>
            <Button variant="ghost" onPress={() => void dashboard.refetch()}>
              Actualizar resumen
            </Button>
          </>
        )}
        <View style={styles.guide}>
          <Ionicons name="compass-outline" size={28} color={colors.success} />
          <Text style={typography.sectionTitle}>¿Por dónde empiezo?</Text>
          <Text style={typography.bodySecondary}>
            Conoce cada módulo con instrucciones cortas y ejemplos, a tu ritmo.
          </Text>
          <Button variant="secondary" onPress={() => router.push('/(app)/guide')}>
            Abrir guía de inicio
          </Button>
        </View>
        <SettingsRow
          icon="person-circle-outline"
          title="Perfil y ajustes"
          subtitle="Categorías, privacidad y sesiones."
          onPress={() => router.push('/(app)/more')}
        />
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  module: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grow: { flex: 1, minWidth: 0, gap: spacing.xs },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  summary: { ...typography.caption, fontWeight: '600', color: colors.primary, marginTop: spacing.xs },
  guide: {
    borderRadius: radius.large,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
  },
});
