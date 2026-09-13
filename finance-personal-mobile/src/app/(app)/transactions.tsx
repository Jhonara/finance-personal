import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTransactions } from '@/features/transactions/use-transactions';
import { useAccounts } from '@/features/accounts/use-accounts';
import { filterCount, type TransactionFilters } from '@/features/transactions/filters';
import { TransactionFiltersModal } from '@/features/transactions/transaction-filters-modal';
import { usePrivacy } from '@/privacy/privacy-provider';
import { FloatingActionButton, QuickActionModal } from '@/ui/actions';
import { TransactionRow } from '@/ui/financial';
import { ScreenHeader } from '@/ui/headers';
import { Button, Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { groupTransactionsByDate } from '@/features/transactions/transaction-grouping';
import {
  presentTransaction,
  type PresentedTransaction,
} from '@/features/transactions/transaction-presentation';
import { colors, radius, spacing, typography } from '@/theme';
import { TransactionDetailSheet } from '@/ui/transaction-detail-sheet';

export default function TransactionsScreen() {
  const [quickActions, setQuickActions] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [selectedTransaction, setSelectedTransaction] = useState<PresentedTransaction>();
  const [noAccountsOpen, setNoAccountsOpen] = useState(false);
  const { hidden } = usePrivacy();
  const accounts = useAccounts();
  const transactions = useTransactions(filters);
  const items = transactions.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  const groups = useMemo(() => groupTransactionsByDate(items), [items]);
  const hasAccounts = Boolean(accounts.data?.some((account) => account.active));
  const canTransfer = Boolean(
    accounts.data?.some(
      (account, index, all) =>
        account.active &&
        all.some(
          (candidate, candidateIndex) =>
            candidateIndex !== index && candidate.active && candidate.currency === account.currency,
        ),
    ),
  );
  const activeFilters = filterCount(filters);
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
    <Screen
      scroll
      refreshing={transactions.isRefetching}
      onRefresh={() => void transactions.refetch()}
      floatingAction={
        <FloatingActionButton
          onPress={() => (hasAccounts ? setQuickActions(true) : setNoAccountsOpen(true))}
        />
      }
    >
      <ScreenHeader title="Movimientos" subtitle="Historial" />
      <View style={styles.filterCard}>
        <Button
          variant="secondary"
          size="compact"
          accessibilityLabel="Abrir filtros"
          onPress={() => setFiltersOpen(true)}
        >
          {activeFilters ? `Filtros (${activeFilters})` : 'Filtros'}
        </Button>
        {activeFilters ? (
          <View style={styles.chips}>
            {filterChips(filters, accounts.data ?? []).map((chip) => (
              <Pressable
                key={chip.key}
                accessibilityRole="button"
                accessibilityLabel={`Quitar filtro ${chip.label}`}
                onPress={() => setFilters((current) => clearFilter(current, chip.key))}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{chip.label} ×</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {activeFilters ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpiar filtros"
            onPress={() => setFilters({})}
          >
            <Text style={styles.clear}>Limpiar</Text>
          </Pressable>
        ) : null}
      </View>
      {items.length ? (
        <View style={styles.list}>
          <Text style={styles.filterSummary}>
            {items.length} {items.length === 1 ? 'movimiento cargado' : 'movimientos cargados'}
          </Text>
          {groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <Text accessibilityRole="header" style={styles.groupHeader}>
                {group.label}
              </Text>
              {group.items.map((transaction) => {
                const presented = presentTransaction(transaction);
                return (
                  <TransactionRow
                    key={transaction.id}
                    type={(transaction.type ?? 'REVERSAL') as Parameters<typeof TransactionRow>[0]['type']}
                    title={presented.title}
                    subtitle={presented.subtitle}
                    amount={transaction.amount ?? 0}
                    amountPrefix={presented.amountPrefix}
                    currency={transaction.currency ?? 'COP'}
                    statusLabel={presented.statusLabel}
                    privacyHidden={hidden}
                    onPress={() => setSelectedTransaction(presented)}
                  />
                );
              })}
            </View>
          ))}
          {transactions.hasNextPage && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cargar más movimientos"
              onPress={() => void transactions.fetchNextPage()}
            >
              <Text style={styles.loadMore}>Cargar más</Text>
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
          description={
            hasAccounts
              ? 'Registra un ingreso, gasto o transferencia para ver tu historial aquí.'
              : 'Crea una cuenta primero para registrar tu saldo y tus movimientos.'
          }
          actionLabel={hasAccounts ? 'Registrar movimiento' : 'Crear cuenta'}
          onAction={() => (hasAccounts ? setQuickActions(true) : router.push('/(app)/account-form'))}
          tone="info"
        />
      )}
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
        canTransfer={canTransfer}
      />
      <TransactionDetailSheet
        transaction={selectedTransaction}
        privacyHidden={hidden}
        onClose={() => setSelectedTransaction(undefined)}
      />
      <Modal transparent visible={noAccountsOpen} onRequestClose={() => setNoAccountsOpen(false)}>
        <View style={styles.noAccountsOverlay}>
          <View style={styles.noAccountsCard}>
            <Text style={typography.sectionTitle}>Primero crea una cuenta</Text>
            <Text style={typography.bodySecondary}>Necesitas una cuenta para registrar tus movimientos.</Text>
            <Button
              onPress={() => {
                setNoAccountsOpen(false);
                router.push('/(app)/account-form');
              }}
            >
              Crear cuenta
            </Button>
            <Button variant="ghost" onPress={() => setNoAccountsOpen(false)}>
              Cancelar
            </Button>
          </View>
        </View>
      </Modal>
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

const styles = StyleSheet.create({
  filterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.large,
    backgroundColor: colors.infoSoft,
  },
  filterSummary: { ...typography.caption, color: colors.textSecondary },
  clear: {
    ...typography.label,
    color: colors.info,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1 },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipText: { ...typography.caption, color: colors.primary },
  list: { gap: spacing.md },
  group: { gap: spacing.xxs },
  groupHeader: { ...typography.label, color: colors.textSecondary, paddingTop: spacing.sm },
  loadMore: { ...typography.label, alignSelf: 'center', padding: spacing.md, color: colors.primary },
  noAccountsOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(32,45,50,0.32)',
  },
  noAccountsCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
  },
});

function filterChips(filters: TransactionFilters, accounts: Array<{ id?: number; name?: string }>) {
  const month =
    filters.year && filters.month
      ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
          new Date(filters.year, filters.month - 1, 1),
        )
      : undefined;
  return [
    month && { key: 'period' as const, label: month },
    (filters.from || filters.to) && { key: 'period' as const, label: 'Rango' },
    filters.accountId !== undefined && {
      key: 'accountId' as const,
      label: accounts.find((account) => account.id === filters.accountId)?.name ?? 'Cuenta',
    },
    filters.categoryId !== undefined && { key: 'categoryId' as const, label: 'Categoría' },
    filters.type && {
      key: 'type' as const,
      label:
        filters.type === 'EXPENSE'
          ? 'Gasto'
          : filters.type === 'INCOME'
            ? 'Ingreso'
            : filters.type === 'TRANSFER'
              ? 'Transferencia'
              : 'Tipo',
    },
    filters.status && {
      key: 'status' as const,
      label:
        filters.status === 'POSTED' ? 'Registrado' : filters.status === 'REVERSED' ? 'Revertido' : 'Anulado',
    },
  ].filter(Boolean) as Array<{
    key: 'period' | 'accountId' | 'categoryId' | 'type' | 'status';
    label: string;
  }>;
}
function clearFilter(
  filters: TransactionFilters,
  key: 'period' | 'accountId' | 'categoryId' | 'type' | 'status',
): TransactionFilters {
  if (key === 'period')
    return { ...filters, year: undefined, month: undefined, from: undefined, to: undefined };
  return { ...filters, [key]: undefined };
}
