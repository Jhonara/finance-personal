import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTransactions } from '@/features/transactions/use-transactions';
import { filterCount, type TransactionFilters } from '@/features/transactions/filters';
import { TransactionFiltersModal } from '@/features/transactions/transaction-filters-modal';
import { usePrivacy } from '@/privacy/privacy-provider';
import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { TransactionRow } from '@/ui/financial';
import { ScreenHeader } from '@/ui/headers';
import { Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { toTransaction } from '@/features/dashboard/dashboard-adapter';

export default function TransactionsScreen() {
  const [quickActions, setQuickActions] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const { hidden } = usePrivacy();
  const transactions = useTransactions(filters);
  const items = transactions.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  if (transactions.isPending)
    return (
      <Screen scroll>
        <ScreenHeader title="Movimientos" />
        <SkeletonRow />
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
      <Pressable accessibilityRole="button" accessibilityLabel="Filtros" onPress={() => setFiltersOpen(true)}>
        <Text>Filtros{filterCount(filters) ? ` (${filterCount(filters)})` : ''}</Text>
      </Pressable>
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
      ) : filterCount(filters) ? (
        <EmptyState
          title="No encontramos movimientos con estos filtros."
          description="Prueba ajustando los criterios de búsqueda."
          actionLabel="Limpiar filtros"
          onAction={() => setFilters({})}
        />
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
      <TransactionFiltersModal
        visible={filtersOpen}
        filters={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFiltersOpen(false);
        }}
        onClear={() => {
          setFilters({});
          setFiltersOpen(false);
        }}
      />
    </Screen>
  );
}
