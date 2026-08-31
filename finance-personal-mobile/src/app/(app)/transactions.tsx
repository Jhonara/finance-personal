import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTransactions } from '@/features/transactions/use-transactions';
import { usePrivacy } from '@/privacy/privacy-provider';
import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { TransactionRow } from '@/ui/financial';
import { ScreenHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { toTransaction } from '@/features/dashboard/dashboard-adapter';

export default function TransactionsScreen() {
  const [quickActions, setQuickActions] = useState(false);
  const { hidden } = usePrivacy();
  const transactions = useTransactions();
  const items = transactions.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  if (transactions.isPending)
    return (
      <Screen scroll>
        <ScreenHeader title="Movimientos" /> <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </Screen>
    );
  if (transactions.isError)
    return (
      <Screen>
        <ScreenHeader title="Movimientos" />
        <ErrorState onRetry={() => void transactions.refetch()} />
      </Screen>
    );
  return (
    <Screen scroll refreshing={transactions.isRefetching} onRefresh={() => void transactions.refetch()}>
      <ScreenHeader title="Movimientos" subtitle="Historial" />
      {items.length ? (
        <View>
          {items.map((transaction) => (
            <TransactionRow key={transaction.id} {...toTransaction(transaction)} privacyHidden={hidden} />
          ))}
          {transactions.hasNextPage && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cargar más movimientos"
              onPress={() => void transactions.fetchNextPage()}
            >
              <Text>Cargar más</Text>
            </Pressable>
          )}
          {transactions.isFetchingNextPage && <ActivityIndicator />}
        </View>
      ) : (
        <EmptyState
          title="Aún no tienes movimientos"
          description="Registra tu primer movimiento para verlo aquí."
          actionLabel="Registrar movimiento"
          onAction={() => setQuickActions(true)}
        />
      )}
      <FloatingActionButton onPress={() => setQuickActions(true)} />
      <QuickActionModal
        visible={quickActions}
        onClose={() => setQuickActions(false)}
        onExpense={() => {
          setQuickActions(false);
          router.push('/(app)/new-expense');
        }}
        onIncome={() => {
          setQuickActions(false);
          router.push('/(app)/new-income');
        }}
        onTransfer={() => {
          setQuickActions(false);
          router.push('/(app)/new-transfer');
        }}
      />
    </Screen>
  );
}
