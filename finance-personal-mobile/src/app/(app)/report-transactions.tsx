import { useAppTheme } from '@/theme/theme-provider';
import { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getCategoryTransactions,
  getReportExpenses,
  getReportTransactions,
} from '@/features/reports/reports-api';
import { dashboardPeriodFromParams, formatDashboardPeriod } from '@/features/dashboard/dashboard-period';
import {
  presentTransaction,
  type PresentedTransaction,
} from '@/features/transactions/transaction-presentation';
import { usePrivacy } from '@/privacy/privacy-provider';
import { Screen, Card, Button } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { EmptyState, ErrorState, SkeletonRow } from '@/ui/states';
import { TransactionRow } from '@/ui/financial';
import { TransactionDetailSheet } from '@/ui/transaction-detail-sheet';
import { spacing, typography } from '@/theme';

export default function ReportTransactions() {
  useAppTheme();
  const {
    year,
    month,
    currency = '',
    category = '',
    categoryId = '',
    day,
    type = 'EXPENSE',
  } = useLocalSearchParams<{
    year?: string;
    month?: string;
    currency?: string;
    category?: string;
    categoryId?: string;
    day?: string;
    type?: 'EXPENSE' | 'INCOME';
  }>();
  const period = dashboardPeriodFromParams(year, month);
  const parsedCategoryId = Number(categoryId);
  const hasCategoryId = Number.isInteger(parsedCategoryId) && parsedCategoryId > 0;
  const uncategorized = categoryId === 'uncategorized';
  const hierarchyReport = hasCategoryId || uncategorized;
  const selectedDay = day == null ? undefined : Number(day);
  const valid = Boolean(
    period &&
    /^[A-Z]{3}$/.test(currency) &&
    (!categoryId || hierarchyReport) &&
    (selectedDay === undefined ||
      (!category &&
        !hierarchyReport &&
        Number.isInteger(selectedDay) &&
        selectedDay >= 1 &&
        selectedDay <= new Date(period.year, period.month, 0).getDate())) &&
    (type === 'EXPENSE' || type === 'INCOME'),
  );
  const { hidden } = usePrivacy();
  const [selected, setSelected] = useState<PresentedTransaction>();
  const query = useInfiniteQuery({
    queryKey: ['transactions', 'report-expenses', period, currency, category, categoryId, type, selectedDay],
    enabled: valid,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      hierarchyReport
        ? getCategoryTransactions(
            uncategorized ? null : parsedCategoryId,
            period!.year,
            period!.month,
            currency,
            type,
            pageParam,
          )
        : type === 'INCOME' || !category
          ? getReportTransactions(period!.year, period!.month, currency, type, pageParam, selectedDay)
          : getReportExpenses(period!.year, period!.month, currency, category, pageParam),
    getNextPageParam: (page) => (page.last ? undefined : (page.page ?? 0) + 1),
  });
  const rows = query.data?.pages.flatMap((page) => page.content ?? []) ?? [];
  return (
    <Screen
      scroll
      entry
      refreshing={valid && query.isRefetching}
      onRefresh={valid ? () => void query.refetch() : undefined}
      style={{ gap: spacing.md }}
    >
      <ScreenHeader
        title="Movimientos del reporte"
        subtitle={category || (type === 'INCOME' ? 'Ingresos del período' : 'Gastos del período')}
        back
        backFallback="/(app)/reports"
      />
      {period && (
        <Text style={typography.label}>
          {selectedDay === undefined ? '' : `Día ${selectedDay} · `}
          {formatDashboardPeriod(period)} · {currency}
        </Text>
      )}
      <Text style={typography.caption}>
        {type === 'INCOME'
          ? 'Ingresos y reversiones que explican este total, con sus fechas y cuentas.'
          : 'Gastos y reversiones que explican este reporte. Una reversión devuelve dinero y reduce el gasto.'}
      </Text>
      {!valid ? (
        <Text style={typography.bodySecondary}>Abre este historial desde un reporte con mes y moneda.</Text>
      ) : query.isPending ? (
        <SkeletonRow />
      ) : query.isError && !query.data ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : (
        <>
          {query.isError && (
            <ErrorState
              title="No pudimos actualizar el historial"
              message="Sigues viendo los datos disponibles."
              onRetry={() => void query.refetch()}
            />
          )}
          {rows.length ? (
            <Card style={{ padding: spacing.md }}>
              {rows.map((transaction) => {
                const item = presentTransaction(transaction);
                if (transaction.type === 'REVERSAL') item.amountPrefix = type === 'INCOME' ? '-' : '+';
                return (
                  <TransactionRow
                    key={transaction.id}
                    type={(transaction.type ?? 'REVERSAL') as Parameters<typeof TransactionRow>[0]['type']}
                    title={item.title}
                    subtitle={item.subtitle}
                    amount={item.amount}
                    amountPrefix={item.amountPrefix}
                    currency={currency}
                    privacyHidden={hidden}
                    statusLabel={item.statusLabel}
                    onPress={() => setSelected(item)}
                  />
                );
              })}
            </Card>
          ) : (
            <EmptyState
              title="Sin movimientos para esta selección"
              description="Regresa al reporte para elegir otra categoría o mes."
            />
          )}
          {query.hasNextPage && (
            <Button
              variant="secondary"
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            >
              Ver más movimientos
            </Button>
          )}
        </>
      )}
      <TransactionDetailSheet
        transaction={selected}
        privacyHidden={hidden}
        onClose={() => setSelected(undefined)}
      />
    </Screen>
  );
}
