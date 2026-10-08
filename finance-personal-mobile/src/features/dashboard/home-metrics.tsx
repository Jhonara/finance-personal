import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import type { DashboardMonth } from '@/api/dashboard-api';
import type { DashboardPeriod } from './dashboard-period';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { MoneyText, MotionPressable } from '@/ui/motion';
import { Progress } from '@/ui/progress';
import { BrandSurface } from '@/ui/brand-surface';
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
      ...Object.keys(data.assetsByCurrency ?? {}),
      ...Object.keys(data.liabilitiesByCurrency ?? {}),
      ...(data.accounts ?? []).map((account) => account.currency).filter(Boolean),
    ]),
  ] as string[];
  const visibleCurrencies: Array<string | undefined> = currencies.length ? currencies : [undefined];
  return (
    <View style={styles.section}>
      <View style={styles.sectionIntro}>
        <Text accessibilityRole="header" style={styles.sectionHeading}>
          Panorama financiero
        </Text>
        <Text style={styles.sectionSubtitle}>Tu dinero y tus créditos, cada uno en su lugar.</Text>
      </View>
      {visibleCurrencies.map((currency) => {
        const accountCount = (data.accounts ?? []).filter((account) => account.currency === currency).length;
        const accountBalance =
          currency && data.assetsByCurrency ? (data.assetsByCurrency[currency] ?? 0) : undefined;
        const debtBalance =
          currency && data.liabilitiesByCurrency ? (data.liabilitiesByCurrency[currency] ?? 0) : undefined;
        const overdue = currency ? data.overdueByCurrency?.[currency] : undefined;
        const emptyCurrency =
          !hidden &&
          accountBalance === 0 &&
          debtBalance === 0 &&
          !(typeof overdue === 'number' && overdue > 0);
        return (
          <View key={currency ?? 'unavailable'} style={styles.panoramaGroup}>
            <View style={styles.panoramaHeader}>
              <View style={styles.currencyBadge}>
                <Ionicons name="globe-outline" size={15} color={colors.primary} />
                <Text style={styles.currencyLabel}>{currency ?? 'Sin moneda'}</Text>
              </View>
              {accountCount ? (
                <View style={styles.accountPill}>
                  <Ionicons name="wallet-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.accountPillText}>
                    {accountCount} {accountCount === 1 ? 'cuenta' : 'cuentas'}
                  </Text>
                </View>
              ) : null}
            </View>
            {emptyCurrency ? (
              <LinearGradient colors={['#E6F8F2', '#F7FFFC']} style={styles.emptyCurrency}>
                <View pointerEvents="none" style={styles.emptyOrb} />
                <View style={styles.emptyTop}>
                  <View style={styles.emptyCurrencyIcon}>
                    <Ionicons name="checkmark-circle-outline" size={26} color={colors.success} />
                  </View>
                  <Text style={styles.emptyTitle}>Sin saldo ni capital pendiente en {currency}</Text>
                </View>
                <View style={styles.emptyValues}>
                  <Text style={styles.emptyValue}>
                    En cuentas · {money(accountBalance, currency, hidden)}
                  </Text>
                  <Text style={styles.emptyValue}>Capital · {money(debtBalance, currency, hidden)}</Text>
                </View>
              </LinearGradient>
            ) : (
              <>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver cuentas desde el panorama"
                  accessibilityValue={{ text: money(accountBalance, currency, hidden) }}
                  onPress={() => router.push('/(app)/accounts')}
                  style={styles.heroPressable}
                >
                  <BrandSurface tone="panorama" style={styles.accountHero}>
                    <View style={styles.heroTop}>
                      <View style={styles.heroIdentity}>
                        <View style={styles.heroIcon}>
                          <Ionicons name="wallet-outline" size={22} color={colors.secondary} />
                        </View>
                        <View style={styles.heroTitles}>
                          <Text style={styles.heroEyebrow}>SALDO REGISTRADO</Text>
                          <Text style={styles.heroTitle}>Dinero en tus cuentas</Text>
                        </View>
                      </View>
                      <HomeCompanion size={64} />
                    </View>
                    <MoneyText
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                      numberOfLines={1}
                      style={styles.heroAmount}
                    >
                      {money(accountBalance, currency, hidden)}
                    </MoneyText>
                    <View style={styles.heroFooter}>
                      <Text style={styles.heroCaption}>Suma de los saldos registrados</Text>
                      <View style={styles.heroLink}>
                        <Text style={styles.heroLinkText}>Ver cuentas</Text>
                        <Ionicons name="arrow-forward" size={15} color={colors.secondary} />
                      </View>
                    </View>
                  </BrandSurface>
                </MotionPressable>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver créditos desde el panorama"
                  accessibilityValue={{ text: money(debtBalance, currency, hidden) }}
                  onPress={() => router.push('/(app)/credits')}
                  style={styles.debtPressable}
                >
                  <LinearGradient colors={[colors.surface, '#EAF4FB']} style={styles.debtSection}>
                    <View pointerEvents="none" style={styles.debtOrb} />
                    <View style={styles.debtHeading}>
                      <View style={styles.debtIcon}>
                        <Ionicons name="document-text-outline" size={23} color={colors.credit} />
                      </View>
                      <View style={styles.debtCopy}>
                        <Text style={styles.debtTitle}>Capital pendiente de tus créditos</Text>
                        <Text style={styles.debtCaption}>
                          {!hidden && typeof debtBalance === 'number' && debtBalance === 0
                            ? 'No tienes capital pendiente registrado'
                            : 'Lo que falta del monto prestado'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.credit} />
                    </View>
                    <MoneyText
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                      numberOfLines={1}
                      style={styles.debtAmount}
                    >
                      {money(debtBalance, currency, hidden)}
                    </MoneyText>
                    <View style={styles.debtFooter}>
                      <Ionicons name="calendar-outline" size={15} color={colors.credit} />
                      <Text style={styles.debtFooterText}>Consulta las cuotas de cada crédito</Text>
                    </View>
                  </LinearGradient>
                </MotionPressable>
                {typeof overdue === 'number' && Number.isFinite(overdue) && overdue > 0 ? (
                  <MotionPressable
                    accessibilityRole="button"
                    accessibilityLabel="Revisar cuotas vencidas en créditos"
                    accessibilityValue={{ text: money(overdue, currency, hidden) }}
                    onPress={() => router.push('/(app)/credits')}
                    style={styles.overdueRow}
                  >
                    <View style={styles.overdueIcon}>
                      <Ionicons name="time-outline" size={21} color={colors.warning} />
                    </View>
                    <View style={styles.overdueCopy}>
                      <Text style={styles.overdueTitle}>Cuotas vencidas estimadas</Text>
                      <MoneyText style={styles.overdueAmount}>{money(overdue, currency, hidden)}</MoneyText>
                      <Text style={styles.overdueCaption}>Toca para revisar tus créditos</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={17} color={colors.warning} />
                  </MotionPressable>
                ) : null}
              </>
            )}
          </View>
        );
      })}
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Cómo leer el panorama financiero"
        accessibilityState={{ expanded: explained }}
        onPress={() => setExplained((value) => !value)}
        style={styles.explainerButton}
      >
        <Ionicons name="information-circle-outline" size={18} color={colors.info} />
        <Text style={styles.explainerLabel}>¿Cómo leer estos montos?</Text>
        <Ionicons name={explained ? 'chevron-up' : 'chevron-down'} size={17} color={colors.info} />
      </MotionPressable>
      {explained ? (
        <Text style={styles.explainerText}>
          El dinero en cuentas y el capital pendiente de tus créditos se muestran separados, por moneda. El
          capital pendiente es el saldo de los créditos, no la cuota de este mes. Las cuotas vencidas son una
          estimación de pagos atrasados y se muestran aparte, sin sumarlas a un total. Este panorama usa lo
          que registraste; no incluye bienes como casa o vehículo.
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
  section: { gap: spacing.md, marginTop: spacing.xl },
  sectionIntro: { gap: spacing.xxs },
  sectionHeading: { ...typography.sectionTitle, fontSize: 17, lineHeight: 23 },
  sectionSubtitle: { ...typography.caption, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  panoramaGroup: { gap: spacing.sm },
  panoramaHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyLabel: { ...typography.label, fontSize: 12, color: colors.primary },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
  },
  accountPillText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  emptyCurrency: {
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  emptyOrb: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    right: -44,
    top: -70,
    backgroundColor: 'rgba(0,229,153,0.1)',
  },
  emptyTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyTitle: { ...typography.cardTitle, flex: 1, color: colors.primaryStrong },
  emptyValues: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emptyValue: {
    ...typography.caption,
    color: colors.primary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  emptyCurrencyIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPressable: { borderRadius: 24, ...shadows.card },
  accountHero: { minHeight: 190, borderRadius: 24, padding: spacing.xl, gap: spacing.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  heroIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.medium,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitles: { flex: 1, gap: spacing.xxs },
  heroEyebrow: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: '#A9F4DB',
  },
  heroTitle: { ...typography.label, color: colors.surface, fontWeight: '700' },
  heroAmount: { ...typography.moneyLarge, fontSize: 30, lineHeight: 38, color: colors.surface },
  heroFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: spacing.md,
  },
  heroCaption: { ...typography.caption, color: '#C7E5E3', flexShrink: 1 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroLinkText: { ...typography.caption, fontWeight: '700', color: colors.secondary },
  debtPressable: { borderRadius: 22, ...shadows.card },
  debtSection: {
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D3E8F4',
  },
  debtOrb: {
    position: 'absolute',
    width: 135,
    height: 135,
    borderRadius: 68,
    right: -65,
    top: -60,
    backgroundColor: 'rgba(129,199,237,0.18)',
  },
  debtHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  debtIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    backgroundColor: colors.creditSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  debtTitle: { ...typography.label, color: colors.credit, fontWeight: '700' },
  debtCaption: { ...typography.caption, color: colors.textSecondary },
  debtAmount: { ...typography.moneyMedium, fontSize: 25, lineHeight: 32, color: colors.primaryStrong },
  debtFooter: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.creditSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  debtFooterText: { ...typography.caption, color: colors.credit, fontWeight: '600' },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.large,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    backgroundColor: '#FFF3D8',
    borderLeftWidth: 4,
    borderLeftColor: colors.amber,
  },
  overdueIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueCopy: { flex: 1, gap: spacing.xxs },
  overdueTitle: { ...typography.label, color: colors.warning, fontWeight: '700' },
  overdueAmount: { ...typography.moneySmall, color: colors.primaryStrong },
  overdueCaption: { ...typography.caption, color: colors.textSecondary },
  explainerButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    backgroundColor: colors.infoSoft,
  },
  explainerLabel: { ...typography.label, flex: 1, color: colors.info },
  explainerText: {
    ...typography.bodySecondary,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.medium,
    padding: spacing.md,
  },
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
