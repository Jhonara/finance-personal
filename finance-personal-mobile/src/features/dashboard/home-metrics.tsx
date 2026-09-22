import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { DashboardMonth } from '@/api/dashboard-api';
import { budgetCurrency, currencyEntries } from './dashboard-adapter';
import { usePrivacy } from '@/privacy/privacy-provider';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import { colors, radius, spacing, typography } from '@/theme';

export function HomeMetrics({ data }: { data: DashboardMonth }) {
  const { hidden } = usePrivacy();
  const { fontScale } = useWindowDimensions();
  const currency = budgetCurrency(data);
  const items = [
    ...currencyEntries(data.assetsByCurrency).map((e) => ({
      label: 'Activos',
      value: e.amount,
      currency: e.currency,
      tone: colors.primarySoft,
    })),
    ...currencyEntries(data.liabilitiesByCurrency).map((e) => ({
      label: 'Pasivos',
      value: e.amount,
      currency: e.currency,
      tone: colors.accentSoft,
    })),
    { label: 'Ingresos', value: data.totalIncome, currency, tone: colors.surface },
    { label: 'Gastos', value: data.totalExpense, currency, tone: colors.surface },
    { label: 'Flujo neto', value: data.netCashFlow ?? data.balance, currency, tone: colors.infoSoft },
  ];
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={`${item.label}-${item.currency}`}
          style={[
            styles.metric,
            { backgroundColor: item.tone },
            (fontScale > 1.15 || item.label === 'Flujo neto') && styles.wide,
          ]}
        >
          <Text style={typography.label}>
            {item.label} <Text style={typography.caption}>· {item.currency}</Text>
          </Text>
          <Text style={typography.moneySmall}>
            {item.value === undefined
              ? 'Sin información'
              : formatPrivateMoney(item.value, item.currency, hidden)}
          </Text>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  metric: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 120,
    padding: spacing.md,
    borderRadius: radius.medium,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  wide: { flexBasis: '100%' },
});
