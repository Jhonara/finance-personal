import { themedStyleSheet } from '@/theme/themed-styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { getDashboardMonth } from '@/api/dashboard-api';
import {
  currentDashboardPeriod,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { dashboardKeys } from '@/features/dashboard/use-dashboard-month';
import { reportCategories, reportCurrency, reportMonths } from '@/features/reports/report-model';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, motion, radius, spacing, typography } from '@/theme';
import { useAppTheme } from '@/theme/theme-provider';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { Card, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { useReducedMotion } from '@/ui/use-reduced-motion';

const monthName = (year: number, month: number) =>
  new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '');

function ChartBar({ height, color }: { height: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const animatedHeight = useRef(new Animated.Value(reducedMotion ? height : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      animatedHeight.setValue(height);
      return;
    }
    const animation = Animated.timing(animatedHeight, {
      toValue: height,
      duration: 420,
      easing: motion.ease,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [animatedHeight, height, reducedMotion]);
  return <Animated.View style={[styles.bar, { height: animatedHeight, backgroundColor: color }]} />;
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState(currentDashboardPeriod);
  const { palette } = useAppTheme();
  const { hidden } = usePrivacy();
  const periods = useMemo(() => reportMonths(period), [period]);
  const queries = useQueries({
    queries: periods.map((entry) => ({
      queryKey: dashboardKeys.month(entry),
      queryFn: ({ signal }: { signal: AbortSignal }) => getDashboardMonth(entry.year, entry.month, signal),
      staleTime: 60_000,
    })),
  });
  const current = queries.at(-1)?.data;
  const currency = reportCurrency(current);
  const categories = reportCategories(current).slice(0, 5);
  const trend = periods.map((entry, index) => ({
    label: monthName(entry.year, entry.month),
    value:
      reportCurrency(queries[index]?.data) === currency && currency
        ? (queries[index]?.data?.totalExpense ?? 0)
        : undefined,
  }));
  const maxExpense = Math.max(1, ...trend.map((item) => item.value ?? 0));
  const money = (value: number) => (currency ? formatPrivateMoney(value, currency, hidden) : '—');
  const refreshing = queries.some((query) => query.isRefetching);
  return (
    <Screen
      entry
      scroll
      refreshing={refreshing}
      onRefresh={() => {
        queries.forEach((query) => void query.refetch());
      }}
      style={{ gap: spacing.lg }}
    >
      <ScreenHeader
        title="Reportes"
        subtitle="Entiende cómo se mueve tu dinero."
        back
        onBack={() => router.back()}
      />
      <View style={[styles.period, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, -1))}
          style={styles.arrow}
        >
          <Ionicons name="chevron-back" size={20} color={palette.primary} />
        </MotionPressable>
        <View style={styles.periodCopy}>
          <Text style={[styles.periodCaption, { color: palette.textMuted }]}>PERÍODO</Text>
          <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>
            {formatDashboardPeriod(period)}
          </Text>
        </View>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          onPress={() => setPeriod((value) => shiftDashboardPeriod(value, 1))}
          style={styles.arrow}
        >
          <Ionicons name="chevron-forward" size={20} color={palette.primary} />
        </MotionPressable>
      </View>
      {queries.at(-1)?.isPending ? (
        <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
          Preparando tu reporte…
        </Text>
      ) : queries.at(-1)?.isError ? (
        <Card style={styles.panel}>
          <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>
            No pudimos cargar este mes
          </Text>
          <MotionPressable accessibilityRole="button" onPress={() => void queries.at(-1)?.refetch()}>
            <Text style={{ color: palette.primary }}>Volver a intentar</Text>
          </MotionPressable>
        </Card>
      ) : !currency ? (
        <MotionEntry>
          <Card style={styles.panel}>
            <Ionicons name="globe-outline" size={28} color={palette.info} />
            <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>
              Tus monedas, por separado
            </Text>
            <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
              Este mes tiene varias monedas o aún no hay una cuenta activa. Para evitar sumas engañosas, el
              gráfico de ingresos y gastos aparece cuando tus cuentas usan una sola moneda.
            </Text>
            {Object.entries(current?.assetsByCurrency ?? {}).map(([code, amount]) => (
              <Text key={code} style={[typography.label, { color: palette.textPrimary }]}>
                {code} en cuentas · {formatPrivateMoney(amount, code, hidden)}
              </Text>
            ))}
          </Card>
        </MotionEntry>
      ) : (
        <>
          <MotionEntry>
            <Card style={styles.hero}>
              <View style={styles.heroHead}>
                <View style={styles.heroIcon}>
                  <Ionicons name="analytics-outline" size={23} color={colors.secondary} />
                </View>
                <Text style={styles.heroLabel}>RESUMEN DEL MES · {currency}</Text>
              </View>
              <View style={styles.totals}>
                <View style={styles.total}>
                  <Text style={styles.totalCaption}>Ingresos</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.totalValue}>
                    {money(current?.totalIncome ?? 0)}
                  </Text>
                </View>
                <View style={styles.total}>
                  <Text style={styles.totalCaption}>Gastos</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.totalValue}>
                    {money(current?.totalExpense ?? 0)}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroFoot}>Montos registrados en el período, calculados por la app.</Text>
            </Card>
          </MotionEntry>
          <Card style={styles.panel}>
            <View style={styles.heading}>
              <Ionicons name="bar-chart-outline" size={22} color={palette.info} />
              <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>Gastos en 6 meses</Text>
            </View>
            <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
              Compara tus meses sin mezclar monedas.
            </Text>
            <View style={styles.chart}>
              {trend.map((item, index) => (
                <View key={`${periods[index]!.year}-${periods[index]!.month}`} style={styles.barColumn}>
                  <Text style={[typography.caption, { color: palette.textMuted }]}>
                    {item.value === undefined
                      ? '—'
                      : item.value === 0
                        ? '0'
                        : new Intl.NumberFormat('es-CO', {
                            notation: 'compact',
                            maximumFractionDigits: 1,
                          }).format(item.value)}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: palette.surfaceSecondary }]}>
                    <ChartBar
                      height={item.value === undefined ? 0 : Math.max(4, (item.value / maxExpense) * 100)}
                      color={index === trend.length - 1 ? colors.secondary : palette.info}
                    />
                  </View>
                  <Text style={[typography.caption, { color: palette.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Card>
          <Card style={styles.panel}>
            <View style={styles.heading}>
              <Ionicons name="pie-chart-outline" size={22} color={palette.success} />
              <Text style={[typography.sectionTitle, { color: palette.textPrimary }]}>¿En qué gastaste?</Text>
            </View>
            {categories.length ? (
              categories.map(([name, amount], index) => (
                <View key={name} style={styles.category}>
                  <View style={styles.categoryHead}>
                    <Text
                      numberOfLines={1}
                      style={[typography.label, { flex: 1, color: palette.textPrimary }]}
                    >
                      {name}
                    </Text>
                    <Text style={[typography.label, { color: palette.textPrimary }]}>{money(amount)}</Text>
                  </View>
                  <View style={[styles.categoryTrack, { backgroundColor: palette.surfaceSecondary }]}>
                    <View
                      style={{
                        width: `${Math.max(5, Math.round((amount / categories[0]![1]) * 100))}%`,
                        height: 7,
                        borderRadius: radius.pill,
                        backgroundColor: index === 0 ? colors.secondary : palette.info,
                      }}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
                Aún no hay gastos por categoría en este mes.
              </Text>
            )}
          </Card>
        </>
      )}
      <Text style={[typography.caption, { color: palette.textMuted }]}>
        Los reportes muestran tus registros. Puedes corregirlos desde Movimientos y Categorías.
      </Text>
    </Screen>
  );
}

const styles = themedStyleSheet(() => ({
  period: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.large,
    padding: spacing.xs,
  },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  periodCopy: { flex: 1, alignItems: 'center' },
  periodCaption: { ...typography.caption, fontWeight: '700', letterSpacing: 0.8 },
  panel: { padding: spacing.lg, gap: spacing.md },
  hero: { padding: spacing.lg, gap: spacing.lg, backgroundColor: '#0C343B', borderColor: '#245E60' },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#225A56',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: { ...typography.caption, color: '#B7EDE0', fontWeight: '700', letterSpacing: 0.6 },
  totals: { flexDirection: 'row', gap: spacing.sm },
  total: {
    flex: 1,
    backgroundColor: '#1A4950',
    borderRadius: radius.medium,
    padding: spacing.md,
    gap: spacing.xs,
  },
  totalCaption: { ...typography.caption, color: '#B9D4D5' },
  totalValue: { ...typography.cardTitle, color: '#FFFFFF' },
  heroFoot: { ...typography.caption, color: '#B9D4D5' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chart: {
    height: 165,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  barColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barTrack: {
    width: '100%',
    height: 105,
    borderRadius: radius.small,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderTopLeftRadius: radius.small, borderTopRightRadius: radius.small },
  category: { gap: spacing.xs },
  categoryHead: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  categoryTrack: { height: 7, borderRadius: radius.pill, overflow: 'hidden' },
}));
