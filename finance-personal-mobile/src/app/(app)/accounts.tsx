import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { useAccounts } from '@/features/accounts/use-accounts';
import { usePrivacy } from '@/privacy/privacy-provider';
import { spacing } from '@/theme';
import { AccountCard } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Button, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';

export default function AccountsScreen() {
  const { hidden } = usePrivacy();
  const accounts = useAccounts();
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
      <ScreenHeader title="Cuentas" subtitle="Tus cuentas" />
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
                balance={0}
                active
                privacyHidden={hidden}
              />
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          title="Aún no tienes cuentas"
          description="Crea tu primera cuenta para empezar a organizar tu dinero."
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
                balance={0}
                active={false}
                privacyHidden={hidden}
              />
            ))}
          </View>
        </>
      ) : null}
      <Button onPress={() => router.push('/(app)/account-form')}>Crear cuenta</Button>
    </Screen>
  );
}
const styles = StyleSheet.create({ list: { gap: spacing.sm } });
