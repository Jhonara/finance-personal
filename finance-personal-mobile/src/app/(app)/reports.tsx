import { themedStyleSheet } from '@/theme/themed-styles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useAccounts } from '@/features/accounts/use-accounts';
import {
  currentDashboardPeriod,
  dashboardPeriodFromParams,
  formatDashboardPeriod,
  shiftDashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { reportCategories, reportCurrencies, reportMonths } from '@/features/reports/report-model';
import { getReportMonth } from '@/features/reports/reports-api';
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
  const { year, month } = useLocalSearchParams<{ year?: string; month?: string }>();
  const [period, setPeriod] = useState(
    () => dashboardPeriodFromParams(year, month) ?? currentDashboardPeriod(),
  );
  useEffect(() => {
    const requested = dashboardPeriodFromParams(year, month);
    if (requested) setPeriod(requested);
  }, [year, month]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>();
  const { palette } = useAppTheme();
  const { hidden } = usePrivacy();
  const periods = useMemo(() => reportMonths(period), [period]);
  const accounts = useAccounts();
  const queries = useQueries({
    queries: periods.map((entry) => ({
      queryKey: ['reports', 'month', entry.year, entry.month],
      queryFn: ({ signal }: { signal: AbortSignal }) => getReportMonth(entry.year, entry.month, signal),
      staleTime: 60_000,
    })),
  });
  const available = reportCurrencies(
    queries.map((query) => query.data),
    (accounts.data ?? []).map((account) => account.currency ?? '').filter(Boolean),
  );
  const currency = selectedCurrency && available.includes(selectedCurrency) ? selectedCurrency : available[0];
  const current = currency ? queries.at(-1)?.data?.[currency] : undefined;
  const categories = reportCategories(current).slice(0, 5);
  const trend = periods.map((entry, index) => ({
    label: monthName(entry.year, entry.month),
    value: currency ? (queries[index]?.data?.[currency]?.expense ?? 0) : undefined,
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
        void accounts.refetch();
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
      {queries.some((query) => query.isPending) || accounts.isPending ? (
        <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
          Preparando tu reporte…
        </Text>
      ) : queries.some((query) => query.isError) || (accounts.isError && !available.length) ? (
        <Card style={styles.panel}>
          <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>
            No pudimos cargar el reporte
          </Text>
          <MotionPressable
            accessibilityRole="button"
            onPress={() => {
              queries.forEach((query) => void query.refetch());
              void accounts.refetch();
            }}
          >
            <Text style={{ color: palette.primary }}>Volver a intentar</Text>
          </MotionPressable>
        </Card>
      ) : !currency ? (
        <MotionEntry>
          <Card style={styles.panel}>
            <Ionicons name="globe-outline" size={28} color={palette.info} />
            <Text style={[typography.cardTitle, { color: palette.textPrimary }]}>
              Aún no hay datos para reportar
            </Text>
            <Text style={[typography.bodySecondary, { color: palette.textSecondary }]}>
              Crea una cuenta o registra un ingreso o gasto para empezar a comparar tus meses.
            </Text>
          </Card>
        </MotionEntry>
      ) : (
        <>
          <View style={styles.currencyRow}>
            {available.map((code) => (
              <MotionPressable
                key={code}
                accessibilityRole="button"
                accessibilityState={{ selected: code === currency }}
                onPress={() => setSelectedCurrency(code)}
                style={[
                  styles.currencyChip,
                  {
                    backgroundColor: code === currency ? palette.primary : palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text
                  style={[typography.label, { color: code === currency ? '#FFFFFF' : palette.textPrimary }]}
                >
                  {code}
                </Text>
              </MotionPressable>
            ))}
          </View>
          <Text style={[typography.caption, { color: palette.textSecondary }]}>
            Elige una moneda. Los gráficos muestran solo movimientos en {currency}; no convierten ni suman
            monedas diferentes.
          </Text>
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
                    {money(current?.income ?? 0)}
                  </Text>
                </View>
                <View style={styles.total}>
                  <Text style={styles.totalCaption}>Gastos</Text>
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.totalValue}>
                    {money(current?.expense ?? 0)}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroFoot}>
                Solo ingresos y gastos de {formatDashboardPeriod(period)}. No incluye traspasos ni pagos de
                créditos.
              </Text>
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
                    {hidden
                      ? '•••'
                      : item.value === undefined
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
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  currencyChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    minWidth: 62,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
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
