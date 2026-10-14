import { themedStyleSheet } from '@/theme/themed-styles';
import { useState } from 'react';
import { Text, View } from 'react-native';
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
import { useAppTheme } from '@/theme/theme-provider';

export default function PlanScreen() {
  const { palette } = useAppTheme();
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
        <ScreenHeader
          title="Explorar"
          subtitle="Tu plan, tus reportes y tus herramientas, en un solo lugar."
        />
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Abrir reportes"
          onPress={() => router.push('/(app)/reports')}
          style={styles.reports}
        >
          <View style={styles.reportsIcon}>
            <Ionicons name="stats-chart" size={25} color={colors.secondary} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.reportsEyebrow}>ENTIENDE TUS NÚMEROS</Text>
            <Text style={styles.reportsTitle}>Reportes y gráficas</Text>
            <Text style={styles.reportsCopy}>Compara meses y descubre en qué gastas.</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.secondary} />
        </MotionPressable>
        <Text accessibilityRole="header" style={[typography.sectionTitle, { color: palette.textPrimary }]}>
          Planifica lo que viene
        </Text>
        <MotionEntry>
          <CreditEntryCard summary={summary?.credit} tourId="plan-credits" />
        </MotionEntry>
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
            style={[styles.module, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <View style={[styles.icon, { backgroundColor: item.tone }]}>
              <Ionicons name={item.icon} size={27} color={item.color} />
            </View>
            <View style={styles.grow}>
              <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>{item.title}</Text>
              <Text style={[typography.caption, { color: palette.textMuted }]}>{item.subtitle}</Text>
              {item.summary && <Text style={styles.summary}>{item.summary}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.primary} />
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
        <Text accessibilityRole="header" style={[typography.sectionTitle, { color: palette.textPrimary }]}>
          Organiza a tu manera
        </Text>
        <SettingsRow
          icon="pricetags-outline"
          title="Categorías"
          subtitle="Ponle nombre a tus ingresos y gastos."
          onPress={() => router.push('/(app)/categories')}
        />
        <View style={[styles.guide, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="compass-outline" size={28} color={colors.success} />
          <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>¿Por dónde empiezo?</Text>
          <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
            Conoce cada módulo con instrucciones cortas y ejemplos, a tu ritmo.
          </Text>
          <Button variant="secondary" onPress={() => router.push('/(app)/guide')}>
            Abrir guía de inicio
          </Button>
        </View>
        <SettingsRow
          icon="person-circle-outline"
          title="Perfil y ajustes"
          subtitle="Apariencia, privacidad y sesiones."
          onPress={() => router.push('/(app)/more')}
        />
      </View>
    </Screen>
  );
}
const styles = themedStyleSheet(() => ({
  content: { gap: spacing.lg },
  reports: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#0C343B',
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: '#245E60',
    padding: spacing.lg,
    minHeight: 112,
  },
  reportsIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#20555A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportsEyebrow: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#77E7C9',
  },
  reportsTitle: { ...typography.sectionTitle, color: '#FFFFFF' },
  reportsCopy: { ...typography.caption, color: '#B5D4D6' },
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
}));
