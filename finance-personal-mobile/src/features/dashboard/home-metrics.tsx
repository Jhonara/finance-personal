import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { DashboardMonth } from '@/api/dashboard-api';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, spacing, typography } from '@/theme';
import { BrandSurface } from '@/ui/brand-surface';
import { FinancialCompanion } from '@/ui/brand-identity';
import { MoneyText } from '@/ui/motion';
import { homeColumns } from './home-plan';

export function FinancialPanorama({ data }: { data: DashboardMonth }) {
  const { hidden } = usePrivacy();
  const { width, fontScale } = useWindowDimensions();
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
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Panorama financiero
      </Text>
      {visibleCurrencies.map((currency) => (
        <BrandSurface key={currency ?? 'unavailable'} tone="panorama" style={styles.panorama}>
          <View style={styles.heroHeading}>
            <View style={styles.heroHeadingCopy}>
              <Text style={styles.heroEyebrow}>PATRIMONIO NETO{currency ? ` · ${currency}` : ''}</Text>
              <View style={styles.heroRule} />
            </View>
            <FinancialCompanion state="neutral" size={44} />
          </View>
          <MoneyText adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.heroAmount}>
            {money(currency ? data.netWorthByCurrency?.[currency] : undefined, currency, hidden)}
          </MoneyText>
          <Text style={styles.explanation}>Tu balance entre lo que tienes y lo que debes.</Text>
          <View style={styles.relation}>
            <View style={[styles.side, homeColumns(width, fontScale) === 1 && styles.wide]}>
              <View style={[styles.sideAccent, { backgroundColor: colors.secondary }]} />
              <View style={styles.sideLabel}>
                <Ionicons name="arrow-up-circle" size={20} color={colors.secondary} />
                <Text style={styles.heroLabel}>Activos</Text>
              </View>
              <MoneyText
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={styles.heroSmallAmount}
              >
                {money(currency ? data.assetsByCurrency?.[currency] : undefined, currency, hidden)}
              </MoneyText>
            </View>
            <View style={[styles.side, homeColumns(width, fontScale) === 1 && styles.wide]}>
              <View style={[styles.sideAccent, { backgroundColor: colors.coral }]} />
              <View style={styles.sideLabel}>
                <Ionicons name="arrow-down-circle" size={20} color={colors.coral} />
                <Text style={styles.heroLabel}>Pasivos</Text>
              </View>
              <MoneyText
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={styles.heroSmallAmount}
              >
                {money(currency ? data.liabilitiesByCurrency?.[currency] : undefined, currency, hidden)}
              </MoneyText>
            </View>
          </View>
        </BrandSurface>
      ))}
    </View>
  );
}

export function HomeMetrics({ data, currency }: { data: DashboardMonth; currency: string }) {
  const { hidden } = usePrivacy();
  const { width, fontScale } = useWindowDimensions();
  const flow = data.netCashFlow ?? data.balance;
  const flowColor = typeof flow !== 'number' ? colors.textPrimary : flow < 0 ? colors.danger : colors.success;
  const metrics = [
    {
      label: 'Ingresos',
      value: data.totalIncome,
      surface: colors.successSoft,
      color: colors.success,
      icon: 'arrow-down-outline' as const,
    },
    {
      label: 'Gastos',
      value: data.totalExpense,
      surface: colors.dangerSoft,
      color: colors.danger,
      icon: 'arrow-up-outline' as const,
    },
  ];
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Este mes
      </Text>
      <BrandSurface tone="insight" style={styles.monthSurface}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthEyebrow}>TU MES · {currency}</Text>
          <Ionicons name="sparkles-outline" size={19} color={colors.primary} />
        </View>
        <View style={styles.monthPair}>
          {metrics.map((item) => (
            <View
              key={item.label}
              style={[
                styles.metric,
                { backgroundColor: item.surface },
                homeColumns(width, fontScale) === 1 && styles.wide,
              ]}
            >
              <View style={styles.metricHeading}>
                <Text style={[typography.label, { color: item.color }]}>{item.label}</Text>
                <Ionicons name={item.icon} size={19} color={item.color} />
              </View>
              <MoneyText
                adjustsFontSizeToFit
                minimumFontScale={0.68}
                numberOfLines={1}
                style={typography.moneySmall}
              >
                {money(item.value, currency, hidden)}
              </MoneyText>
            </View>
          ))}
        </View>
        <View style={styles.flow}>
          <View style={styles.flowCopy}>
            <Text style={styles.flowLabel}>Flujo neto</Text>
            <Text style={styles.flowContext}>Ingresos menos gastos registrados</Text>
          </View>
          <MoneyText
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={[typography.moneyMedium, styles.flowAmount, { color: flowColor }]}
          >
            {!hidden && typeof flow === 'number' && flow > 0 ? '+' : ''}
            {money(flow, currency, hidden)}
          </MoneyText>
        </View>
      </BrandSurface>
    </View>
  );
}

function money(value: number | undefined, currency: string | undefined, hidden: boolean) {
  return typeof value === 'number' && Number.isFinite(value) && currency
    ? formatPrivateMoney(value, currency, hidden)
    : 'Sin información';
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xl },
  panorama: { gap: spacing.md, padding: spacing.xl },
  heroHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroHeadingCopy: { flex: 1, gap: spacing.sm, paddingTop: spacing.xs },
  heroEyebrow: { ...typography.label, color: colors.infoSoft, letterSpacing: 0.7 },
  heroRule: { width: 42, height: 3, borderRadius: radius.pill, backgroundColor: colors.secondary },
  heroAmount: { ...typography.moneyLarge, fontSize: 36, lineHeight: 44, color: colors.surface },
  heroSmallAmount: { ...typography.moneySmall, color: colors.surface },
  heroLabel: { ...typography.label, color: colors.surface },
  explanation: { ...typography.bodySecondary, color: colors.infoSoft },
  relation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  side: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.medium,
    backgroundColor: colors.heroSoft,
  },
  sideAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  sideLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  wide: { flexBasis: '100%' },
  monthSurface: { gap: spacing.md, padding: spacing.md },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  monthEyebrow: { ...typography.caption, color: colors.primary, letterSpacing: 0.6, fontWeight: '700' },
  monthPair: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 92,
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.medium,
    justifyContent: 'space-between',
  },
  metricHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.medium,
    backgroundColor: colors.surface,
  },
  flowCopy: { flex: 1, minWidth: 130, gap: spacing.xs },
  flowLabel: { ...typography.label, color: colors.primaryStrong },
  flowContext: { ...typography.caption, color: colors.textMuted },
  flowAmount: { flexShrink: 1 },
});
