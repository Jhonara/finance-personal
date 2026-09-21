import { openForm } from '@/features/forms/form-session';
import { StyleSheet, Text, View } from 'react-native';

import { useAccounts } from '@/features/accounts/use-accounts';
import { balanceForAccount, totalAccountBalance } from '@/features/accounts/account-balances';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { usePrivacy } from '@/privacy/privacy-provider';
import { spacing, typography } from '@/theme';
import { AccountBalanceAmount } from '@/ui/account-balance';
import { AccountCard } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Card, IconButton, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';

export default function AccountsScreen() {
  const { hidden } = usePrivacy();
  const accounts = useAccounts();
  const dashboard = useDashboardMonth(currentDashboardPeriod());
  if (accounts.isPending)
    return (
      <Screen>
        <ScreenHeader title="Cuentas" />
        <SkeletonRow />
        <SkeletonRow />
      </Screen>
    );
  if (accounts.isError)
    return (
      <Screen>
        <ScreenHeader title="Cuentas" />
        <ErrorState onRetry={() => void accounts.refetch()} />
      </Screen>
    );
  const active = accounts.data.filter((account) => account.active);
  const inactive = accounts.data.filter((account) => !account.active);
  return (
    <Screen scroll>
      <ScreenHeader
        title="Cuentas"
        subtitle="Dónde manejas tu dinero"
        rightAction={
          accounts.data.length ? (
            <IconButton
              name="add"
              accessibilityLabel="Agregar cuenta"
              onPress={() => openForm('/(app)/account-form')}
              tone="primary"
            />
          ) : undefined
        }
      />
      {active.length ? (
        <Card style={styles.summary}>
          <Text style={typography.cardTitle}>Tus cuentas</Text>
          {Array.from(new Set(active.map((account) => account.currency ?? 'COP'))).map((currency) => (
            <View key={currency} style={styles.currencyTotal}>
              <Text style={typography.moneySmall}>{currency} ·</Text>
              <AccountBalanceAmount
                balance={totalAccountBalance(
                  active
                    .filter((account) => (account.currency ?? 'COP') === currency)
                    .map((account) => balanceForAccount(dashboard, account.id)),
                )}
                currency={currency}
                hidden={hidden}
              />
            </View>
          ))}
        </Card>
      ) : null}
      {active.length ? (
        <>
          <SectionHeader title="Activas" />
          <View style={styles.list}>
            {active.map((account) => (
              <AccountCard
                onPress={() => openForm('/(app)/account-detail', { id: String(account.id) })}
                key={account.id}
                name={account.name ?? 'Cuenta'}
                typeLabel={account.type ?? 'Cuenta'}
                currency={account.currency ?? 'COP'}
                balance={balanceForAccount(dashboard, account.id)}
                active
                privacyHidden={hidden}
              />
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          title="Tu dinero empieza aquí"
          description="Agrega la cuenta donde manejas tu dinero."
          actionLabel="Agregar cuenta"
          onAction={() => openForm('/(app)/account-form')}
          tone="primary"
        />
      )}
      {inactive.length ? (
        <>
          <SectionHeader title="Inactivas" />
          <View style={styles.list}>
            {inactive.map((account) => (
              <AccountCard
                onPress={() => openForm('/(app)/account-detail', { id: String(account.id) })}
                key={account.id}
                name={account.name ?? 'Cuenta'}
                typeLabel={account.type ?? 'Cuenta'}
                currency={account.currency ?? 'COP'}
                balance={balanceForAccount(dashboard, account.id)}
                active={false}
                privacyHidden={hidden}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  currencyTotal: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  list: { gap: spacing.sm },
  summary: { gap: spacing.xs, padding: spacing.lg },
});
