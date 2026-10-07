import { openForm } from '@/features/forms/form-session';
import { TourTarget } from '@/ui/tour-target';
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { dashboardPeriodFromParams } from '@/features/dashboard/dashboard-period';

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useTransactions } from '@/features/transactions/use-transactions';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useQuickActions } from '@/features/quick-actions/quick-action-provider';
import { filterCount, type TransactionFilters } from '@/features/transactions/filters';
import { TransactionFiltersModal } from '@/features/transactions/transaction-filters-modal';
import { usePrivacy } from '@/privacy/privacy-provider';
import { TransactionRow } from '@/ui/financial';
import { Screen } from '@/ui/primitives';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { HomeBrandMark, HomeCompanion } from '@/features/dashboard/home-brand';
import { MotionPressable } from '@/ui/motion';
import { groupTransactionsByDate } from '@/features/transactions/transaction-grouping';
import {
  presentTransaction,
  type PresentedTransaction,
} from '@/features/transactions/transaction-presentation';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { TransactionDetailSheet } from '@/ui/transaction-detail-sheet';

export default function TransactionsScreen() {
  const { width, fontScale } = useWindowDimensions();
  const compact = width / fontScale < 280;
  const { open: openQuickActions } = useQuickActions();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { year, month } = useLocalSearchParams<{ year?: string; month?: string }>();
  const [filters, setFilters] = useState<TransactionFilters>(
    () => dashboardPeriodFromParams(year, month) ?? {},
  );
  useFocusEffect(
    useCallback(() => {
      const requested = dashboardPeriodFromParams(year, month);
      if (requested) setFilters(requested);
    }, [year, month]),
  );
  const [selectedTransaction, setSelectedTransaction] = useState<PresentedTransaction>();
  const { hidden, toggle } = usePrivacy();
  const accounts = useAccounts();
  const transactions = useTransactions(filters);
  const items = transactions.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  const groups = useMemo(() => groupTransactionsByDate(items), [items]);
  const hasAccounts = Boolean(accounts.data?.some((account) => account.active));
  const activeFilters = filterCount(filters);
  const pageHeader = (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeading}>
        <Text style={styles.eyebrow}>FINANZAS · ACTIVIDAD</Text>
        <Text accessibilityRole="header" style={styles.pageTitle}>
          Movimientos
        </Text>
        <Text style={styles.pageSubtitle}>Tus ingresos, gastos y transferencias.</Text>
      </View>
      <View style={styles.pageActions}>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar importes' : 'Ocultar importes'}
          onPress={() => void toggle()}
          style={styles.privacy}
        >
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.primaryStrong}
          />
        </MotionPressable>
        <HomeBrandMark size={36} />
      </View>
    </View>
  );
  if (transactions.isPending)
    return (
      <Screen entry scroll>
        {pageHeader}
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </Screen>
    );
  if (transactions.isError)
    return (
      <Screen entry>
        {pageHeader}
        <ErrorState onRetry={() => void transactions.refetch()} />
      </Screen>
    );
  return (
    <Screen entry scroll refreshing={transactions.isRefetching} onRefresh={() => void transactions.refetch()}>
      {pageHeader}
      {items.length ? (
        <LinearGradient
          colors={['#0D282E', '#105158']}
          style={[styles.overview, compact && styles.overviewCompact]}
        >
          <View style={styles.overviewCopy}>
            <Text style={styles.overviewEyebrow}>TU HISTORIAL</Text>
            <Text style={styles.overviewCount}>
              {items.length} {items.length === 1 ? 'movimiento cargado' : 'movimientos cargados'}
            </Text>
            {!compact ? (
              <Text style={styles.overviewHint}>Revisa cada detalle o registra uno nuevo.</Text>
            ) : null}
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Registrar movimiento"
              onPress={openQuickActions}
              style={styles.register}
            >
              <Ionicons name="add" size={17} color={colors.primaryStrong} />
              <Text style={styles.registerText}>Registrar</Text>
            </MotionPressable>
          </View>
          <HomeCompanion size={compact ? 60 : 76} />
        </LinearGradient>
      ) : null}
      <View style={styles.toolbar}>
        <Text accessibilityRole="header" style={styles.historyTitle}>
          Historial
        </Text>
        <TourTarget id="movement-filters">
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros"
            onPress={() => setFiltersOpen(true)}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={styles.filterButtonText}>
              {activeFilters ? `Filtros · ${activeFilters}` : 'Filtros'}
            </Text>
          </MotionPressable>
        </TourTarget>
      </View>
      {activeFilters > 0 && (
        <View style={styles.filterArea}>
          {activeFilters ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {filterChips(filters, accounts.data ?? []).map((chip) => (
                <MotionPressable
                  key={chip.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar filtro ${chip.label}`}
                  onPress={() => setFilters((current) => clearFilter(current, chip.key))}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{chip.label} ×</Text>
                </MotionPressable>
              ))}
            </ScrollView>
          ) : null}
          {activeFilters ? (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros"
              onPress={() => setFilters({})}
            >
              <Text style={styles.clear}>Limpiar</Text>
            </MotionPressable>
          ) : null}
        </View>
      )}
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Organizar categorías"
        onPress={() => router.push('/(app)/categories')}
        style={styles.categoriesLink}
      >
        <View style={styles.categoriesIcon}>
          <Ionicons name="pricetags-outline" size={20} color={colors.success} />
        </View>
        <View style={styles.categoriesCopy}>
          <Text style={styles.categoriesTitle}>Organizar categorías</Text>
          <Text style={typography.caption}>Edita las opciones de ingresos y gastos.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </MotionPressable>
      {items.length ? (
        <View style={styles.list}>
          {groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <View style={styles.groupHeading}>
                <View style={styles.groupDot} />
                <Text accessibilityRole="header" style={styles.groupHeader}>
                  {group.label}
                </Text>
              </View>
              <View style={styles.groupCard}>
                {group.items.map((transaction) => {
                  const presented = presentTransaction(transaction);
                  return (
                    <TransactionRow
                      key={transaction.id}
                      type={(transaction.type ?? 'REVERSAL') as Parameters<typeof TransactionRow>[0]['type']}
                      title={presented.title}
                      subtitle={presented.subtitle}
                      amount={transaction.amount}
                      amountPrefix={presented.amountPrefix}
                      currency={transaction.currency ?? 'COP'}
                      statusLabel={presented.statusLabel}
                      privacyHidden={hidden}
                      compact={width <= 360}
                      onPress={() => setSelectedTransaction(presented)}
                    />
                  );
                })}
              </View>
            </View>
          ))}
          {transactions.hasNextPage && (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Cargar más movimientos"
              onPress={() => void transactions.fetchNextPage()}
            >
              <Text style={styles.loadMore}>Cargar más</Text>
            </MotionPressable>
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
        <View style={styles.empty}>
          <HomeCompanion size={92} />
          <Text accessibilityRole="header" style={styles.emptyTitle}>
            Tu historia empieza aquí
          </Text>
          <Text style={styles.emptyDescription}>
            {hasAccounts
              ? 'Registra un ingreso, gasto o transferencia y aparecerá en tu historial.'
              : 'Crea una cuenta para empezar a registrar y entender tus movimientos.'}
          </Text>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={hasAccounts ? 'Registrar movimiento' : 'Crear cuenta'}
            onPress={() => (hasAccounts ? openQuickActions() : openForm('/(app)/account-form'))}
            style={styles.emptyButton}
          >
            <Ionicons name="add" size={18} color={colors.primaryStrong} />
            <Text style={styles.emptyButtonText}>
              {hasAccounts ? 'Registrar movimiento' : 'Crear cuenta'}
            </Text>
          </MotionPressable>
        </View>
      )}
      <TransactionDetailSheet
        transaction={selectedTransaction}
        privacyHidden={hidden}
        onClose={() => setSelectedTransaction(undefined)}
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

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  pageHeading: { flex: 1, gap: spacing.xs },
  eyebrow: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.success,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  pageTitle: { ...typography.screenTitle, fontSize: 27, lineHeight: 33 },
  pageSubtitle: { ...typography.caption, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  pageActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  privacy: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoSoft,
  },
  overview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.card,
  },
  overviewCompact: { padding: spacing.md },
  overviewCopy: { flex: 1, gap: spacing.xs },
  overviewEyebrow: {
    ...typography.caption,
    color: '#C8F4E7',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  overviewCount: { ...typography.sectionTitle, color: colors.surface, fontSize: 19, lineHeight: 25 },
  overviewHint: { ...typography.caption, color: '#CBE4E5' },
  register: {
    alignSelf: 'flex-start',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  registerText: { ...typography.label, color: colors.primaryStrong, fontWeight: '700' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyTitle: { ...typography.sectionTitle, fontSize: 18, lineHeight: 24 },
  filterButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
  filterButtonText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  filterArea: { gap: spacing.xs },
  categoriesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.large,
    backgroundColor: colors.primarySoft,
  },
  categoriesIcon: {
    width: 39,
    height: 39,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  categoriesCopy: { flex: 1, gap: spacing.xxs },
  categoriesTitle: { ...typography.label, color: colors.primaryStrong },
  clear: {
    ...typography.caption,
    color: colors.info,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    fontWeight: '700',
  },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipText: { ...typography.caption, color: colors.primary },
  list: { gap: spacing.lg, marginTop: spacing.sm },
  group: { gap: spacing.sm },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  groupDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.secondary },
  groupHeader: { ...typography.label, color: colors.primaryStrong },
  groupCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  loadMore: {
    ...typography.label,
    alignSelf: 'center',
    padding: spacing.md,
    color: colors.primary,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.large,
    backgroundColor: colors.infoSoft,
  },
  emptyTitle: { ...typography.sectionTitle, textAlign: 'center' },
  emptyDescription: { ...typography.bodySecondary, textAlign: 'center' },
  emptyButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  emptyButtonText: { ...typography.label, color: colors.primaryStrong, fontWeight: '700' },
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
