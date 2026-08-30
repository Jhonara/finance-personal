import { StyleSheet, View } from 'react-native';

import { usePrivacy } from '@/privacy/privacy-provider';
import { previewAccounts } from '@/preview/finance-preview';
import { spacing } from '@/theme';
import { AccountCard } from '@/ui/financial';
import { ScreenHeader, SectionHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';

export default function AccountsScreen() {
  const { hidden } = usePrivacy();
  return (
    <Screen scroll>
      <ScreenHeader title="Cuentas" subtitle="Tus saldos por cuenta" />
      <SectionHeader title="COP" />
      <View style={styles.list}>
        {previewAccounts.map((account) => (
          <AccountCard key={account.name} {...account} privacyHidden={hidden} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.sm } });
