import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from './dashboard-period';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MoneyText, MotionPressable } from '@/ui/motion';
import { Progress } from '@/ui/progress';
import { HomeCompanion } from './home-brand';
import { homePlan } from './home-plan';

function money(value: number | undefined, currency: string | undefined, hidden: boolean) {
  return typeof value === 'number' && Number.isFinite(value) && currency
    ? formatPrivateMoney(value, currency, hidden)
    : 'Sin datos';
}

export function FinancialPanorama({ data }: { data: DashboardMonth }) {
  const { hidden } = usePrivacy();
  const [explained, setExplained] = useState(false);
  const currencies = [
    ...new Set([
      ...Object.keys(data.netWorthByCurrency ?? {}),
      ...Object.keys(data.assetsByCurrency ?? {}),
      ...Object.keys(data.liabilitiesByCurrency ?? {}),
      ...(data.accounts ?? [])
        .filter((account) => account.active)
        .map((account) => account.currency)
        .filter(Boolean),
    ]),
  ] as string[];
  const visibleCurrencies: Array<string | undefined> = currencies.length ? currencies : [undefined];
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionHeading}>
        Panorama financiero
      </Text>
      {visibleCurrencies.map((currency) => {
        const accountCount = (data.accounts ?? []).filter(
          (account) => account.active && account.currency === currency,
        ).length;
        return (
          <LinearGradient
            key={currency ?? 'unavailable'}
            colors={['#0B262B', '#0E383C', '#0A3438']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View pointerEvents="none" style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <Text style={styles.heroEyebrow}>BALANCE REGISTRADO{currency ? ` · ${currency}` : ''}</Text>
              {accountCount ? (
                <View style={styles.accountPill}>
                  <View style={styles.accountDot} />
                  <Text style={styles.accountPillText}>
                    {accountCount} {accountCount === 1 ? 'cuenta' : 'cuentas'}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.heroMiddle}>
              <View style={styles.heroCopy}>
                <MoneyText
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  numberOfLines={1}
                  style={styles.heroAmount}
                >
                  {money(currency ? data.netWorthByCurrency?.[currency] : undefined, currency, hidden)}
                </MoneyText>
                <Text style={styles.heroExplanation}>
                  Dinero en cuentas menos capital pendiente de tus créditos.
                </Text>
              </View>
              <HomeCompanion size={82} />
            </View>
            <View style={styles.relation}>
              <View style={styles.side}>
                <View style={styles.sideHeading}>
                  <View style={[styles.sideDot, { backgroundColor: colors.secondary }]} />
                  <Text style={styles.sideLabel}>En cuentas</Text>
                  <Ionicons name="arrow-up-outline" size={14} color={colors.secondary} />
                </View>
                <MoneyText
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  numberOfLines={1}
                  style={styles.sideAmount}
                >
                  {money(
                    currency && data.assetsByCurrency ? (data.assetsByCurrency[currency] ?? 0) : undefined,
                    currency,
                    hidden,
                  )}
                </MoneyText>
              </View>
              <View style={styles.side}>
                <View style={styles.sideHeading}>
                  <View style={[styles.sideDot, { backgroundColor: colors.coral }]} />
                  <Text style={styles.sideLabel}>Deuda total</Text>
                  <Ionicons name="arrow-down-outline" size={14} color={colors.coral} />
                </View>
                <MoneyText
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  numberOfLines={1}
                  style={styles.sideAmount}
                >
                  {money(
                    currency && data.liabilitiesByCurrency
                      ? (data.liabilitiesByCurrency[currency] ?? 0)
                      : undefined,
                    currency,
                    hidden,
                  )}
                </MoneyText>
              </View>
            </View>
            {currency && typeof data.overdueByCurrency?.[currency] === 'number' ? (
              <View style={styles.overdueRow}>
                <Text style={styles.sideLabel}>Cuotas vencidas estimadas</Text>
                <MoneyText style={styles.sideAmount}>
                  {money(data.overdueByCurrency[currency], currency, hidden)}
                </MoneyText>
              </View>
            ) : null}
            <Text style={styles.heroExplanation}>No incluye bienes como tu casa o vehículo.</Text>
          </LinearGradient>
        );
      })}
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Cómo se calcula mi balance"
        accessibilityState={{ expanded: explained }}
        onPress={() => setExplained((value) => !value)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text style={typography.label}>¿Qué son activos, pasivos y patrimonio? {explained ? '−' : '+'}</Text>
      </MotionPressable>
      {explained ? (
        <Text style={typography.bodySecondary}>
          Activos: lo que tienes. Pasivos: tus deudas. Patrimonio neto = activos menos pasivos. Este balance
          solo incluye las cuentas y créditos registrados, por moneda. La deuda total muestra capital
          pendiente; las cuotas vencidas estiman pagos atrasados, sin mora ni seguros, y no se suman otra vez
          a la deuda.
        </Text>
      ) : null}
    </View>
  );
}

export function HomeMetrics({
  data,
  currency,
  period,
}: {
  data: DashboardMonth;
  currency: string;
  period: DashboardPeriod;
}) {
  const { hidden } = usePrivacy();
  const flow = data.netCashFlow ?? data.balance;
  const budgetPercent = homePlan(data, period).budgetPercent;
  const metrics = [
    {
      label: 'Ingresos',
      value: data.totalIncome,
      prefix: '',
      icon: 'arrow-down-outline' as const,
      surface: '#DCFAF0',
      ink: colors.success,
    },
    {
      label: 'Gastos',
      value: data.totalExpense,
      prefix: '',
      icon: 'arrow-up-outline' as const,
      surface: '#FFEAE9',
      ink: colors.danger,
    },
    {
      label: 'Flujo neto',
      value: flow,
      prefix: !hidden && typeof flow === 'number' && flow > 0 ? '+' : '',
      icon: 'swap-horizontal-outline' as const,
      surface: '#DEF4FB',
      ink: typeof flow === 'number' && flow < 0 ? colors.danger : colors.success,
    },
  ];
  return (
    <View style={styles.section}>
      <View style={styles.monthHeading}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          Este mes
        </Text>
        <Text style={styles.monthCurrency}>{currency}</Text>
      </View>
      <LinearGradient colors={[colors.surface, '#F6FCFF']} style={styles.monthCard}>
        <View style={styles.metrics}>
          {metrics.map((metric) => (
            <View key={metric.label} style={[styles.metric, { backgroundColor: metric.surface }]}>
              <View style={[styles.metricIcon, { backgroundColor: metric.ink }]}>
                <Ionicons name={metric.icon} size={15} color={colors.surface} />
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricLabel}>
                {metric.label}
              </Text>
              <MoneyText
                adjustsFontSizeToFit
                minimumFontScale={0.55}
                numberOfLines={1}
                style={[styles.metricAmount, { color: metric.ink }]}
              >
                {metric.prefix}
                {money(metric.value, currency, hidden)}
              </MoneyText>
            </View>
          ))}
        </View>
        {budgetPercent !== undefined ? (
          <View style={styles.budgetFoot}>
            <View style={styles.budgetCaption}>
              <Text style={styles.budgetLabel}>Presupuesto del mes</Text>
              <Text style={styles.budgetValue}>
                {budgetPercent.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% utilizado
              </Text>
            </View>
            <Progress
              value={budgetPercent}
              color={budgetPercent >= 100 ? colors.danger : colors.secondary}
              label="Presupuesto del mes utilizado"
            />
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  overdueRow: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: '#FFFFFF25' },
  section: { gap: spacing.sm, marginTop: spacing.xl },
  sectionHeading: { ...typography.sectionTitle, fontSize: 17, lineHeight: 23 },
  hero: { overflow: 'hidden', borderRadius: 26, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  heroGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#156367',
    opacity: 0.38,
    right: -55,
    top: -70,
  },
  heroTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroEyebrow: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#D5F4F1',
    flexShrink: 1,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#14534A',
  },
  accountDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.secondary },
  accountPillText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 13,
    color: '#BDF8DD',
    fontWeight: '700',
  },
  heroMiddle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  heroAmount: { ...typography.moneyLarge, fontSize: 31, lineHeight: 38, color: colors.surface },
  heroExplanation: { ...typography.caption, fontSize: 11, lineHeight: 15, color: '#C5E4E4' },
  relation: { flexDirection: 'row', gap: spacing.sm },
  side: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.medium,
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sideHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sideDot: { width: 6, height: 6, borderRadius: 3 },
  sideLabel: { ...typography.caption, color: '#D3ECEC', fontSize: 10, lineHeight: 14, flex: 1 },
  sideAmount: { ...typography.moneySmall, color: colors.surface, fontSize: 14, lineHeight: 19 },
  monthHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  monthCurrency: {
    ...typography.caption,
    color: colors.info,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  monthCard: { borderRadius: 24, padding: spacing.md, gap: spacing.md, ...shadows.card },
  metrics: { flexDirection: 'row', gap: spacing.xs },
  metric: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricIcon: {
    width: 25,
    height: 25,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  metricAmount: { ...typography.moneySmall, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  budgetFoot: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  budgetCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  budgetLabel: { ...typography.caption, color: colors.textSecondary },
  budgetValue: { ...typography.caption, color: colors.success, fontWeight: '700' },
});
