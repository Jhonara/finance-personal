import { MoneyText } from '@/ui/motion';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { DashboardMonth } from '@/api/dashboard-api';
import { budgetCurrency } from './dashboard-adapter';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, spacing, typography } from '@/theme';
import { BrandSurface } from '@/ui/brand-surface';
import { homeColumns } from './home-plan';

export function FinancialPanorama({ data }: { data: DashboardMonth }) {
  const { hidden } = usePrivacy();
  const { width, fontScale } = useWindowDimensions();
  const currencies = [
    ...new Set([
      ...Object.keys(data.netWorthByCurrency ?? {}),
      ...Object.keys(data.assetsByCurrency ?? {}),
      ...Object.keys(data.liabilitiesByCurrency ?? {}),
    ]),
  ];
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Panorama financiero
      </Text>
      {currencies.length ? (
        currencies.map((currency) => (
          <BrandSurface key={currency} tone="panorama" style={styles.panorama}>
            <View style={styles.heroHeading}>
              <Text style={styles.heroEyebrow}>PATRIMONIO NETO · {currency}</Text>
              <View
                style={styles.heroBadge}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="wallet-outline" size={19} color={colors.surface} />
              </View>
            </View>
            <MoneyText
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={styles.heroAmount}
            >
              {money(data.netWorthByCurrency?.[currency], currency, hidden)}
            </MoneyText>
            <Text style={styles.explanation}>Tu balance entre lo que tienes y lo que debes.</Text>
            <View style={styles.relation}>
              <View style={[styles.side, homeColumns(width, fontScale) === 1 && styles.wide]}>
                <View style={styles.sideLabel}>
                  <Ionicons name="arrow-up-circle" size={20} color={colors.mint} />
                  <Text style={styles.heroLabel}>Activos</Text>
                </View>
                <MoneyText
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  numberOfLines={1}
                  style={styles.heroSmallAmount}
                >
                  {money(data.assetsByCurrency?.[currency], currency, hidden)}
                </MoneyText>
              </View>
              <View
                style={[styles.side, styles.liabilities, homeColumns(width, fontScale) === 1 && styles.wide]}
              >
                <View style={styles.sideLabel}>
                  <Ionicons name="arrow-down-circle" size={20} color={colors.coral} />
                  <Text style={styles.heroLabel}>Pasivos</Text>
                </View>
                <MoneyText
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  numberOfLines={1}
                  style={styles.heroSmallAmount}
                >
                  {money(data.liabilitiesByCurrency?.[currency], currency, hidden)}
                </MoneyText>
              </View>
            </View>
          </BrandSurface>
        ))
      ) : (
        <BrandSurface tone="panorama">
          <Text style={styles.heroEyebrow}>PATRIMONIO NETO</Text>
          <Text style={styles.explanation}>Tu panorama irá tomando forma con tus cuentas.</Text>
        </BrandSurface>
      )}
    </View>
  );
}
export function HomeMetrics({ data }: { data: DashboardMonth }) {
  const { hidden } = usePrivacy();
  const { width, fontScale } = useWindowDimensions();
  const currency = budgetCurrency(data);
  const flow = data.netCashFlow ?? data.balance;
  const flowTone = typeof flow === 'number' && flow < 0 ? colors.expense : colors.success;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.sectionTitle}>
        Este mes
      </Text>
      <View style={styles.month}>
        <View style={styles.monthPair}>
          {[
            {
              label: 'Ingresos',
              value: data.totalIncome,
              surface: colors.successSoft,
              color: colors.success,
              icon: 'arrow-down-outline',
            },
            {
              label: 'Gastos',
              value: data.totalExpense,
              surface: colors.expenseSoft,
              color: colors.expense,
              icon: 'arrow-up-outline',
            },
          ].map((item) => (
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
                <Ionicons
                  name={item.icon as 'arrow-down-outline' | 'arrow-up-outline'}
                  size={18}
                  color={item.color}
                />
              </View>
              <MoneyText
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={1}
                style={typography.moneySmall}
              >
                {money(item.value, currency, hidden)}
              </MoneyText>
            </View>
          ))}
        </View>
        <View style={styles.flow}>
          <View style={styles.metricHeading}>
            <Text style={styles.eyebrow}>Flujo neto · {currency}</Text>
            <Ionicons name="sparkles-outline" size={18} color={flowTone} />
          </View>
          <MoneyText style={[typography.moneyMedium, { color: flowTone }]}>
            {!hidden && typeof flow === 'number' && flow > 0 ? '+' : ''}
            {money(flow, currency, hidden)}
          </MoneyText>
        </View>
      </View>
    </View>
  );
}
function money(value: number | undefined, currency: string, hidden: boolean) {
  return typeof value === 'number' && Number.isFinite(value)
    ? formatPrivateMoney(value, currency, hidden)
    : 'Sin información';
}
const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xl },
  panorama: { gap: spacing.md, padding: spacing.xl },
  heroHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroEyebrow: { ...typography.label, color: '#D3F4F1', letterSpacing: 0.7 },
  heroBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.heroSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: { ...typography.moneyLarge, fontSize: 34, lineHeight: 42, color: colors.surface },
  heroSmallAmount: { ...typography.moneySmall, color: colors.surface },
  heroLabel: { ...typography.label, color: '#ECFAF9' },
  sideLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  eyebrow: { ...typography.label, color: colors.primaryStrong },
  explanation: { ...typography.bodySecondary, color: '#D3E9EC' },
  relation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  side: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.medium,
    backgroundColor: colors.heroSoft,
  },
  liabilities: { backgroundColor: 'rgba(255,255,255,0.09)' },
  wide: { flexBasis: '100%' },
  month: { gap: spacing.sm },
  monthPair: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.large,
  },
  metricHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  flow: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
