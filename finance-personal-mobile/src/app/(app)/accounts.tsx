import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAccounts } from '@/features/accounts/use-accounts';
import { balanceForAccount } from '@/features/accounts/account-balances';
import { currentDashboardPeriod } from '@/features/dashboard/dashboard-period';
import { useDashboardMonth } from '@/features/dashboard/use-dashboard-month';
import { usePrivacy } from '@/privacy/privacy-provider';
import { spacing } from '@/theme';
import { AccountCard } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { IconButton, Screen } from '@/ui/primitives';
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
        subtitle="Tus cuentas"
        rightAction={
          accounts.data.length ? (
            <IconButton
              name="add"
              accessibilityLabel="Agregar cuenta"
              onPress={() => router.push('/(app)/account-form')}
              tone="primary"
            />
          ) : undefined
        }
      />
      {active.length ? (
        <>
          <SectionHeader title="Activas" />
          <View style={styles.list}>
            {active.map((account) => (
              <AccountCard
                onPress={() =>
                  router.push({ pathname: '/(app)/account-detail', params: { id: String(account.id) } })
                }
                key={account.id}
                name={account.name ?? 'Cuenta'}
                typeLabel={account.type ?? 'Cuenta'}
                currency={account.currency ?? 'COP'}
                balance={balanceForAccount(dashboard.data?.accounts, account.id)}
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
          onAction={() => router.push('/(app)/account-form')}
          tone="primary"
        />
      )}
      {inactive.length ? (
        <>
          <SectionHeader title="Inactivas" />
          <View style={styles.list}>
            {inactive.map((account) => (
              <AccountCard
                onPress={() =>
                  router.push({ pathname: '/(app)/account-detail', params: { id: String(account.id) } })
                }
                key={account.id}
                name={account.name ?? 'Cuenta'}
                typeLabel={account.type ?? 'Cuenta'}
                currency={account.currency ?? 'COP'}
                balance={balanceForAccount(dashboard.data?.accounts, account.id)}
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
const styles = StyleSheet.create({ list: { gap: spacing.sm } });
