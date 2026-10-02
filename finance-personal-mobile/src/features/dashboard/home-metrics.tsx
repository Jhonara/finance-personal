import { MoneyText } from '@/ui/motion';
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
            <Text style={styles.eyebrow}>PATRIMONIO NETO · {currency}</Text>
            <MoneyText style={typography.moneyLarge}>
              {money(data.netWorthByCurrency?.[currency], currency, hidden)}
            </MoneyText>
            <Text style={styles.explanation}>Tu balance entre lo que tienes y lo que debes.</Text>
            <View style={styles.relation}>
              <View style={[styles.side, homeColumns(width, fontScale) === 1 && styles.wide]}>
                <Text style={typography.label}>Activos</Text>
                <MoneyText style={typography.moneySmall}>
                  {money(data.assetsByCurrency?.[currency], currency, hidden)}
                </MoneyText>
                <Text style={typography.caption}>Lo que tienes</Text>
              </View>
              <View
                style={[styles.side, styles.liabilities, homeColumns(width, fontScale) === 1 && styles.wide]}
              >
                <Text style={typography.label}>Pasivos</Text>
                <MoneyText style={typography.moneySmall}>
                  {money(data.liabilitiesByCurrency?.[currency], currency, hidden)}
                </MoneyText>
                <Text style={typography.caption}>Lo que debes</Text>
              </View>
            </View>
          </BrandSurface>
        ))
      ) : (
        <BrandSurface tone="panorama">
          <Text style={typography.bodySecondary}>Tu panorama irá tomando forma con tus cuentas.</Text>
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
            },
            { label: 'Gastos', value: data.totalExpense, surface: colors.expenseSoft, color: colors.expense },
          ].map((item) => (
            <View
              key={item.label}
              style={[
                styles.side,
                { backgroundColor: item.surface },
                homeColumns(width, fontScale) === 1 && styles.wide,
              ]}
            >
              <Text style={[typography.label, { color: item.color }]}>{item.label}</Text>
              <MoneyText style={typography.moneySmall}>{money(item.value, currency, hidden)}</MoneyText>
            </View>
          ))}
        </View>
        <View style={styles.flow}>
          <Text style={styles.eyebrow}>Flujo neto · {currency}</Text>
          <MoneyText style={typography.moneyMedium}>
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
  panorama: { gap: spacing.sm, padding: spacing.lg },
  eyebrow: { ...typography.label, color: colors.primaryStrong },
  explanation: { ...typography.bodySecondary, color: colors.primaryStrong },
  relation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  side: {
    flexBasis: '45%',
    flexGrow: 1,
    minWidth: 0,
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: radius.medium,
    backgroundColor: colors.brandGlow,
  },
  liabilities: { backgroundColor: colors.creditSoft },
  wide: { flexBasis: '100%' },
  month: { backgroundColor: colors.infoSoft, borderRadius: radius.large, overflow: 'hidden' },
  monthPair: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.sm },
  flow: { gap: spacing.xs, padding: spacing.lg, paddingTop: spacing.sm },
});
