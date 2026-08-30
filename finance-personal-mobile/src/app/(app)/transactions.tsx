import { useState } from 'react';
import { router } from 'expo-router';

import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { TransactionRow } from '@/ui/financial';
import { ScreenHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';
import { previewTransactions } from '@/preview/finance-preview';
import { usePrivacy } from '@/privacy/privacy-provider';

export default function TransactionsScreen() {
  const [quickActions, setQuickActions] = useState(false);
  const { hidden } = usePrivacy();
  return (
    <Screen scroll>
      <ScreenHeader title="Movimientos" subtitle="Vista previa" />
      {previewTransactions.map((transaction) => (
        <TransactionRow key={transaction.title} {...transaction} privacyHidden={hidden} />
      ))}
      <FloatingActionButton onPress={() => setQuickActions(true)} />
      <QuickActionModal
        visible={quickActions}
        onClose={() => setQuickActions(false)}
        onExpense={() => {
          setQuickActions(false);
          router.push('/(app)/new-expense');
        }}
      />
    </Screen>
  );
}
