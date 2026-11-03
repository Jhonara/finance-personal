import { useAppTheme } from '@/theme/theme-provider';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Disclosure } from '@/ui/disclosure';
import { getDashboardMonth } from '@/api/dashboard-api';
import { useAccounts } from '@/features/accounts/use-accounts';
import { dashboardKeys } from '@/features/dashboard/use-dashboard-month';
import {
  currentDashboardPeriod,
  dashboardPeriodFromParams,
  type DashboardPeriod,
} from '@/features/dashboard/dashboard-period';
import { getBudgets, getCredits } from '@/features/secondary/secondary-api';
import { secondaryKeys } from '@/features/secondary/use-secondary';
import {
  reportCurrencies,
  reportMonths,
  reportViews,
  currencyMonth,
  periodContext,
  type ReportView,
} from '@/features/reports/report-model';
import { getBudgetVsActual, getCategoryReport, getReportMonth } from '@/features/reports/reports-api';
import { ReportPeriodPicker } from '@/features/reports/report-period-picker';
import { MonthlyOverview } from '@/features/reports/monthly-reports';
import { CategoryHierarchyReport } from '@/features/reports/category-hierarchy-report';
import { BudgetReport, CreditReport, SavingsReport } from '@/features/reports/plan-reports';
import { AccountReport } from '@/features/reports/account-report';
import {
  ReportChoice,
  ReportEmpty,
  ReportNotice,
  ReportPanel,
  reportStyles as s,
} from '@/features/reports/report-ui';
import { usePrivacy } from '@/privacy/privacy-provider';
import { colors, radius, spacing } from '@/theme';
import { themedStyleSheet } from '@/theme/themed-styles';
import { MotionEntry, MotionPressable } from '@/ui/motion';
import { Button, Screen } from '@/ui/primitives';
import { ScreenHeader } from '@/ui/headers';
import { ModalSelector } from '@/ui/modal-selector';

const overviewViews = reportViews.slice(0, 3);
const additionalViews = reportViews.slice(3);

export default function ReportsScreen() {
  useAppTheme();
  const {
    year,
    month,
    currency: requestedCurrency,
    report: requestedReport,
  } = useLocalSearchParams<{ year?: string; month?: string; currency?: string; report?: ReportView }>();
  const [period, setPeriod] = useState<DashboardPeriod>(
    () => dashboardPeriodFromParams(year, month) ?? currentDashboardPeriod(),
  );
  useEffect(() => {
    const requested = dashboardPeriodFromParams(year, month);
    if (requested) setPeriod(requested);
  }, [year, month]);
  const [view, setView] = useState<ReportView>(() =>
    reportViews.some((item) => item.id === requestedReport) ? requestedReport! : 'summary',
  );
  useEffect(() => {
    if (requestedReport && reportViews.some((item) => item.id === requestedReport)) setView(requestedReport);
  }, [requestedReport]);
  const [count, setCount] = useState(6);
  const [choosingReport, setChoosingReport] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(requestedCurrency ?? '');
  useEffect(() => {
    if (requestedCurrency) setSelectedCurrency(requestedCurrency);
  }, [requestedCurrency]);
  const { hidden, toggle } = usePrivacy();
  const today = currentDashboardPeriod();
  const monthly = reportViews.find((item) => item.id === view)!.monthly;
  const periods = useMemo(() => reportMonths(period, count), [period, count]);
  const accounts = useAccounts();
  const queries = useQueries({
    queries: periods.map((entry) => ({
      queryKey: ['reports', 'month', entry.year, entry.month],
      queryFn: ({ signal }: { signal: AbortSignal }) => getReportMonth(entry.year, entry.month, signal),
      enabled:
        monthly && (view === 'summary' || (entry.year === period.year && entry.month === period.month)),
      staleTime: 60_000,
    })),
  });
  const snapshot = useQuery({
    queryKey: dashboardKeys.month(today),
    queryFn: ({ signal }) => getDashboardMonth(today.year, today.month, signal),
    enabled: !monthly,
    staleTime: 60_000,
  });
  const credits = useQuery({
    queryKey: secondaryKeys.credits,
    queryFn: getCredits,
    enabled: view === 'credits',
    staleTime: 60_000,
  });
  const budgets = useQuery({
    queryKey: secondaryKeys.budgets(period.year, period.month),
    queryFn: () => getBudgets(period.year, period.month),
    enabled: view === 'budgets',
    staleTime: 60_000,
  });
  const budgetComparison = useQuery({
    queryKey: ['reports', 'budget-vs-actual', period.year, period.month],
    queryFn: () => getBudgetVsActual(period.year, period.month),
    enabled: view === 'budgets',
    staleTime: 60_000,
  });
  const available = reportCurrencies(
    queries.map((query) => query.data),
    [
      ...(accounts.data ?? []).map((account) => account.currency ?? ''),
      ...Object.keys(snapshot.data?.assetsByCurrency ?? {}),
      ...Object.keys(snapshot.data?.liabilitiesByCurrency ?? {}),
      ...(snapshot.data?.savings ?? []).map((goal) => goal.currency ?? ''),
      ...(credits.data ?? []).map((credit) => credit.currency ?? ''),
      ...(view === 'budgets' ? ['COP'] : []),
    ],
  );
  const currency = selectedCurrency && available.includes(selectedCurrency) ? selectedCurrency : available[0];
  const categoryReport = useQuery({
    queryKey: ['reports', 'categories', period.year, period.month, currency, view],
    queryFn: () =>
      getCategoryReport(period.year, period.month, currency!, view === 'income' ? 'INCOME' : 'EXPENSE'),
    enabled: (view === 'expenses' || view === 'income') && Boolean(currency),
    staleTime: 60_000,
  });
  const currentQuery = queries.at(-1)!;
  const current = currency ? currencyMonth(currentQuery.data, currency) : undefined;
  const previous = currency ? currencyMonth(queries.at(-2)?.data, currency) : undefined;
  const points = periods.map((entry, index) => ({
    ...entry,
    ...currencyMonth(queries[index]?.data, currency ?? ''),
  }));
  const activeQueries =
    view === 'budgets'
      ? [budgets, budgetComparison]
      : view === 'credits'
        ? [snapshot, credits]
        : view === 'expenses' || view === 'income'
          ? currency
            ? [categoryReport]
            : [accounts, currentQuery]
          : monthly
            ? [currentQuery]
            : [snapshot];
  const waiting = activeQueries.some((query) => query.isPending && !query.data);
  const failed = activeQueries.some((query) => query.isError && !query.data);
  const stale = activeQueries.some((query) => query.isError && query.data);
  const refreshing =
    activeQueries.some((query) => query.isRefetching) ||
    (monthly && queries.some((query) => query.isRefetching));
  const refresh = () => {
    void accounts.refetch();
    if (monthly) {
      if (view === 'summary') queries.forEach((query) => void query.refetch());
      else void currentQuery.refetch();
    } else void snapshot.refetch();
    if (view === 'budgets') void budgets.refetch();
    if (view === 'budgets') void budgetComparison.refetch();
    if (currency && (view === 'expenses' || view === 'income')) void categoryReport.refetch();
    if (view === 'credits') void credits.refetch();
  };
  return (
    <Screen
      scroll
      scrollResetKey={`${view}-${period.year}-${period.month}-${selectedCurrency}`}
      refreshing={refreshing}
      onRefresh={refresh}
      style={{ gap: spacing.lg }}
    >
      <ScreenHeader title="Reportes" back onBack={() => router.back()} />
      <View style={styles.navigation}>
        {overviewViews.map((item) => (
          <MotionPressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={'Reporte: ' + item.label}
            accessibilityState={{ selected: view === item.id }}
            onPress={() => setView(item.id)}
            style={[styles.tab, view === item.id && styles.activeTab]}
          >
            <Text style={view === item.id ? s.selectedText : s.caption}>{item.label}</Text>
          </MotionPressable>
        ))}
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Más reportes"
          accessibilityState={{
            expanded: choosingReport,
            selected: additionalViews.some((item) => item.id === view),
          }}
          onPress={() => setChoosingReport(true)}
          style={[styles.tab, additionalViews.some((item) => item.id === view) && styles.activeTab]}
        >
          <Text style={s.caption}>{additionalViews.find((item) => item.id === view)?.label ?? 'Más'} ▾</Text>
        </MotionPressable>
      </View>
      <ModalSelector
        visible={choosingReport}
        label="Más reportes"
        subtitle="Presupuesto, saldos, deuda y metas."
        options={additionalViews.map((item, index) => ({ id: index, label: item.label, icon: item.icon }))}
        selectedId={additionalViews.findIndex((item) => item.id === view)}
        onClose={() => setChoosingReport(false)}
        onSelect={(id) => {
          const selected = additionalViews[id];
          if (selected) setView(selected.id);
        }}
      />
      {monthly ? (
        <>
          <ReportPeriodPicker period={period} onChange={setPeriod} />
          <Text style={s.caption}>{periodContext(period, today)}</Text>
        </>
      ) : (
        <View style={s.note}>
          <Text style={s.eyebrow}>ESTADO ACTUAL</Text>
          <Text style={s.caption}>Saldos y avances de hoy.</Text>
        </View>
      )}
      {available.length ? (
        <View style={s.between}>
          <View style={{ flex: 1 }}>
            <ReportChoice
              label="Moneda del reporte"
              choices={available.map((code) => ({ value: code, label: code }))}
              selected={currency!}
              onSelect={setSelectedCurrency}
            />
          </View>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar importes del reporte' : 'Ocultar importes del reporte'}
            onPress={() => void toggle()}
            style={styles.privacy}
          >
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.primary} />
          </MotionPressable>
        </View>
      ) : null}
      {waiting ? (
        <ReportNotice>Preparando este reporte…</ReportNotice>
      ) : failed ? (
        <ReportPanel title="Este reporte no pudo cargar" icon="cloud-offline-outline">
          <Text style={s.body}>Puedes reintentarlo o abrir otra vista; tus registros siguen guardados.</Text>
          <Button variant="secondary" onPress={refresh}>
            Volver a intentar
          </Button>
        </ReportPanel>
      ) : !currency ? (
        <ReportPanel title="Tu primer reporte empieza con un registro" icon="analytics-outline">
          <ReportEmpty
            title="Aún no hay datos para mostrar"
            action="Ver cuentas"
            onPress={() => router.push('/(app)/accounts')}
          >
            Crea una cuenta y registra un ingreso o gasto. Después podrás comparar meses y seguir tus
            objetivos aquí.
          </ReportEmpty>
        </ReportPanel>
      ) : (
        <>
          {stale ? (
            <ReportNotice>
              No pudimos actualizar esta vista. Estás viendo los últimos datos guardados; desliza hacia abajo
              para reintentar.
            </ReportNotice>
          ) : null}
          <MotionEntry key={[view, currency, period.year, period.month].join('-')}>
            <View style={s.stack}>
              {view === 'summary' && current ? (
                <MonthlyOverview
                  current={current}
                  previous={previous}
                  period={period}
                  currency={currency}
                  hidden={hidden}
                  points={points}
                  count={count}
                  onCount={setCount}
                  onExpenses={() => setView('expenses')}
                  historyIncomplete={queries.some((query) => query.isError)}
                  onRetryHistory={() =>
                    queries.filter((query) => query.isError).forEach((query) => void query.refetch())
                  }
                />
              ) : null}
              {(view === 'expenses' || view === 'income') && categoryReport.data ? (
                <CategoryHierarchyReport
                  data={categoryReport.data}
                  period={period}
                  currency={currency}
                  type={view === 'income' ? 'INCOME' : 'EXPENSE'}
                  hidden={hidden}
                />
              ) : null}
              {(view === 'expenses' || view === 'income') && categoryReport.isError ? (
                <ReportPanel
                  title="No se pudo actualizar el detalle por categoría"
                  icon="cloud-offline-outline"
                >
                  <Text style={s.body}>
                    Puedes consultar los datos del mes y volver a intentar este desglose.
                  </Text>
                  <Button variant="secondary" onPress={() => void categoryReport.refetch()}>
                    Reintentar desglose
                  </Button>
                </ReportPanel>
              ) : null}
              {view === 'budgets' && budgets.data ? (
                <BudgetReport
                  budgets={budgets.data}
                  comparison={budgetComparison.data}
                  comparisonError={budgetComparison.isError}
                  onRetryComparison={() => void budgetComparison.refetch()}
                  period={period}
                  currency={currency}
                  hidden={hidden}
                />
              ) : null}
              {view === 'accounts' && snapshot.data ? (
                <AccountReport data={snapshot.data} currency={currency} hidden={hidden} />
              ) : null}
              {view === 'credits' && credits.data && snapshot.data ? (
                <CreditReport
                  credits={credits.data}
                  total={
                    snapshot.data.liabilitiesByCurrency?.[currency] ??
                    (credits.data.some((item) => item.currency === currency) ? undefined : 0)
                  }
                  currency={currency}
                  hidden={hidden}
                />
              ) : null}
              {view === 'savings' && snapshot.data ? (
                <SavingsReport data={snapshot.data} currency={currency} hidden={hidden} />
              ) : null}
            </View>
          </MotionEntry>
        </>
      )}
      <Disclosure title="Cómo leer los reportes">
        <Text style={s.caption}>
          Cada moneda se consulta por separado. Cuentas, créditos y metas muestran saldos actuales; el mes
          solo cambia ingresos, gastos y presupuestos.
        </Text>
        <Text style={s.caption}>
          Los reportes usan tus registros. Corrige un dato en su módulo y vuelve a consultar.
        </Text>
      </Disclosure>
    </Screen>
  );
}
const styles = themedStyleSheet(() => ({
  navigation: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderColor: colors.divider },
  tab: {
    minHeight: 48,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTab: { borderColor: colors.success },
  privacy: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
}));
