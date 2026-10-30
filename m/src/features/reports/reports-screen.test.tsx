import React from 'react';
vi.mock('react-native-reanimated', () => import('@/test/chart-reanimated'));
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  hidden: false,
  params: { year: '2026', month: '10' },
}));
vi.mock('react-native', () => {
  const host =
    (name: string) =>
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode | ((value: { pressed: boolean }) => React.ReactNode);
    }) =>
      React.createElement(
        name,
        props,
        typeof children === 'function' ? children({ pressed: false }) : children,
      );
  const animation = () => ({
    start: (done?: (value: { finished: boolean }) => void) => done?.({ finished: true }),
    stop() {},
  });
  return {
    View: host('View'),
    Text: host('Text'),
    Pressable: host('Pressable'),
    ScrollView: host('ScrollView'),
    RefreshControl: host('RefreshControl'),
    ActivityIndicator: host('ActivityIndicator'),
    TextInput: host('TextInput'),
    Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? children : null,
    StyleSheet: { create: (styles: object) => styles },
    Platform: { select: (values: Record<string, unknown>) => values.android ?? values.default },
    useWindowDimensions: () => ({ width: 360, height: 740, fontScale: 1 }),
    AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) },
    Animated: {
      View: host('AnimatedView'),
      Text: host('AnimatedText'),
      Value: class {
        setValue() {}
        stopAnimation() {}
        interpolate() {
          return 1;
        }
      },
      timing: animation,
      spring: animation,
    },
  };
});
vi.mock('react-native-svg', () => {
  const host =
    (name: string) =>
    ({ children, ...props }: React.PropsWithChildren) =>
      React.createElement(name, props, children);
  return {
    default: host('Svg'),
    Circle: host('Circle'),
    G: host('G'),
    Line: host('Line'),
    Rect: host('Rect'),
    Path: host('Path'),
    Text: host('SvgText'),
  };
});
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: (props: object) => React.createElement('Icon', props),
}));
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: React.PropsWithChildren) =>
    React.createElement('Gradient', undefined, children),
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24 }),
  SafeAreaView: ({ children }: React.PropsWithChildren) => children,
}));
vi.mock('expo-router', () => ({
  router: { push: mocks.push, back: mocks.back },
  useLocalSearchParams: () => mocks.params,
  useFocusEffect: (effect: () => void) => React.useEffect(effect, [effect]),
}));
vi.mock('@/auth/auth-provider', () => ({ api: { get: mocks.get, patch: mocks.patch } }));
vi.mock('@/privacy/privacy-provider', () => ({
  usePrivacy: () => ({ hidden: mocks.hidden, toggle: vi.fn() }),
}));
import ReportsScreen from '@/app/(app)/reports';
import { ReportTrend } from './report-charts';
import type { ReportMonth } from './report-model';
import { ExpenseBreakdown } from './monthly-reports';
import { AccountReport } from './account-report';
import { useUpdateCategory } from '@/features/categories/use-categories';
import { Button } from '@/ui/primitives';
let client: QueryClient;
let trees: ReturnType<typeof create>[];
let months: Record<number, ReportMonth>;
let failMonth: number | undefined;
const dashboard = {
  assetsByCurrency: { COP: 8000, USD: 30 },
  liabilitiesByCurrency: { COP: 5000 },
  accounts: [{ id: 1, name: 'Principal', currency: 'COP', balance: 8000, active: true }],
  savings: [{ id: 4, name: 'Estudios', currency: 'COP', target: 1000, current: 200, progressPercent: 20 }],
};
const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : Array.isArray(value)
      ? value.map(text).join('')
      : value && typeof value === 'object' && 'children' in value
        ? text(value.children)
        : '';
const content = (tree: ReturnType<typeof create>) => text(tree.toJSON());
async function render(children: React.ReactNode = <ReportsScreen />) {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  });
  trees.push(tree);
  return tree;
}
async function settle(check: () => void) {
  await act(async () => {
    await vi.waitFor(check);
  });
}
async function press(tree: ReturnType<typeof create>, label: string) {
  const button = tree.root
    .findAll((node) => (node.type as unknown) === 'Pressable')
    .find((node) => node.props.accessibilityLabel === label || text(node) === label);
  expect(button, label).toBeDefined();
  await act(async () => {
    button!.props.onPress({ stopPropagation() {} });
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.hidden = false;
  mocks.params = { year: '2026', month: '10' };
  trees = [];
  failMonth = undefined;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  months = {
    10: {
      COP: { income: 1000, expense: 250, expensesByCategory: { Mercado: 200, Transporte: 50 } },
      USD: { income: 80, expense: 20, expensesByCategory: { Viaje: 20 } },
    },
    9: { COP: { income: 1000, expense: 200, expensesByCategory: { Mercado: 200 } } },
  };
  mocks.get.mockImplementation(async (url: string, config?: { params?: { month?: number } }) => {
    if (url === '/accounts')
      return {
        data: [
          { id: 1, currency: 'COP' },
          { id: 2, currency: 'USD' },
        ],
      };
    if (url === '/reports/month') {
      const month = config?.params?.month ?? 0;
      if (month === failMonth) throw Error('offline');
      return { data: months[month] ?? {} };
    }
    if (url === '/dashboard/month') return { data: dashboard };
    if (url === '/budgets')
      return {
        data: [
          {
            id: 2,
            year: 2026,
            month: config?.params?.month,
            categoryName: 'Mercado',
            limitAmount: 500,
            spentAmount: 200,
            remainingAmount: 300,
            percentageUsed: 40,
            status: 'OK',
          },
        ],
      };
    if (url === '/credits')
      return {
        data: [
          {
            id: 3,
            name: 'Casa',
            currency: 'COP',
            status: 'LATE',
            remainingBalance: 5000,
            principal: 10000,
            paidPrincipal: 2000,
            openingBalance: 7000,
            paidInterest: 200,
            nextPaymentDate: '2026-10-01',
            expectedPaymentAmount: 300,
          },
        ],
      };
    throw Error('Unexpected endpoint ' + url);
  });
});
afterEach(async () => {
  await act(async () => trees.forEach((tree) => tree.unmount()));
  client.clear();
});

describe('Report journeys', () => {
  it('keeps monthly reports currency-safe, switches periods and expands the trend to twelve months', async () => {
    const tree = await render();
    await settle(() => expect(content(tree)).toContain('25% de tus ingresos'));
    await press(tree, 'Moneda del reporte: USD');
    await settle(() => expect(content(tree)).toContain('TU MES EN USD'));
    expect(content(tree)).not.toContain('Mercado');
    await press(tree, 'Historial: 12 meses');
    await settle(() => expect(tree.root.findByType(ReportTrend).props.points).toHaveLength(12));
    await press(tree, 'Mes siguiente');
    await settle(() => expect(content(tree)).toContain('Este mes aún no tiene ingresos ni gastos en USD'));
    await press(tree, 'Ver movimientos de este mes');
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: '/(app)/transactions',
      params: { year: 2026, month: 11 },
    });
  });
  it('shows the current month when an older request fails and retries only failed history', async () => {
    failMonth = 9;
    const tree = await render();
    await settle(() => expect(content(tree)).toContain('Faltan meses por cargar'));
    expect(content(tree)).toContain('25% de tus ingresos');
    expect(content(tree)).toContain('Mes anterior no disponible');
    expect(tree.root.findByType(ReportTrend).props.points.at(-2).expense).toBeUndefined();
    failMonth = undefined;
    await press(tree, 'Reintentar historial');
    await settle(() => expect(content(tree)).not.toContain('Faltan meses por cargar'));
    expect(content(tree)).toContain('25% más que el mes anterior');
  });
  it('isolates report errors so another report remains usable', async () => {
    failMonth = 10;
    const tree = await render();
    await settle(() => expect(content(tree)).toContain('Este reporte no pudo cargar'));
    await press(tree, 'Reporte: Cuentas');
    await settle(() => expect(content(tree)).toContain('¿Dónde está tu dinero?'));
    expect(content(tree)).toContain('ESTADO ACTUAL');
    expect(
      tree.root.findAll((node) => node.props.accessibilityLabel === 'Elegir mes del reporte'),
    ).toHaveLength(0);
  });
  it('opens the exact account, credit and goal from their report', async () => {
    const tree = await render();
    await settle(() => expect(content(tree)).toContain('TU MES EN COP'));
    await press(tree, 'Reporte: Cuentas');
    await settle(() => expect(content(tree)).toContain('Principal'));
    await press(tree, 'Ver cuenta Principal');
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: '/(app)/account-detail', params: { id: 1 } });
    await press(tree, 'Reporte: Créditos');
    await settle(() => expect(content(tree)).toContain('Casa'));
    await press(tree, 'Ver pagos y amortización');
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: '/(app)/credit-detail', params: { id: 3 } });
    await press(tree, 'Reporte: Metas');
    await settle(() => expect(content(tree)).toContain('Estudios'));
    await press(tree, 'Ver meta Estudios');
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: '/(app)/saving-detail', params: { id: 4 } });
  });
  it('does not label COP budgets with a selected foreign currency', async () => {
    const tree = await render();
    await settle(() => expect(content(tree)).toContain('TU MES EN COP'));
    await press(tree, 'Moneda del reporte: USD');
    await press(tree, 'Reporte: Presupuestos');
    await settle(() => expect(content(tree)).toContain('están definidos en COP'));
    expect(content(tree)).not.toContain('Gastado');
    await press(tree, 'Moneda del reporte: COP');
    await settle(() => expect(content(tree)).toContain('40% utilizado'));
    await press(tree, 'Revisar presupuesto');
    expect(mocks.push).toHaveBeenLastCalledWith({
      pathname: '/(app)/budget-detail',
      params: { id: 2, year: 2026, month: 10 },
    });
  });
  it('opens the month grid and picks a past month without affecting the current-state reports', async () => {
    const tree = await render();
    await settle(() => expect(content(tree)).toContain('TU MES EN COP'));
    await press(tree, 'Elegir mes del reporte');
    await press(tree, 'Año anterior');
    await press(tree, 'Febrero de 2025');
    await settle(() => expect(content(tree)).toContain('Febrero de 2025'));
    expect(mocks.get).toHaveBeenCalledWith(
      '/reports/month',
      expect.objectContaining({ params: { year: 2025, month: 2 } }),
    );
    await press(tree, 'Reporte: Cuentas');
    await settle(() => expect(content(tree)).toContain('ESTADO ACTUAL'));
    expect(mocks.get).toHaveBeenCalledWith(
      '/dashboard/month',
      expect.objectContaining({
        params: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
      }),
    );
  });
  it('hides chart geometry and financial accessibility labels in privacy mode', async () => {
    mocks.hidden = true;
    const tree = await render();
    await settle(() => expect(content(tree)).toContain('Gráfica oculta'));
    expect(tree.root.findAll((node) => (node.type as unknown) === 'Svg')).toHaveLength(0);
    expect(content(tree)).not.toContain('1.000');
    expect(content(tree)).not.toContain('25%');
    await press(tree, 'Reporte: Gastos');
    await settle(() => expect(content(tree)).toContain('¿En qué gastaste?'));
    expect(tree.root.findAll((node) => (node.type as unknown) === 'Svg')).toHaveLength(0);
  });
  it('shows reversals with their sign and never draws negative pie slices', async () => {
    const tree = await render(
      <ExpenseBreakdown
        current={{ income: 0, expense: 80, expensesByCategory: { Mercado: 100, Ajuste: -20 } }}
        currency="COP"
        hidden={false}
      />,
    );
    expect(content(tree)).toContain('Hay reversiones o ajustes');
    expect(content(tree)).toContain('Ajuste');
    expect(content(tree)).toContain('-');
    expect(tree.root.findAll((node) => (node.type as unknown) === 'Circle')).toHaveLength(0);
  });
  it('opens category movements with the report month and currency while retaining the comparison', async () => {
    const tree = await render(
      <ExpenseBreakdown
        current={months[10]!.COP!}
        currency="COP"
        hidden={false}
        period={{ year: 2026, month: 10 }}
      />,
    );
    await press(tree, 'Comparar categoría Mercado');
    await press(tree, 'Ver movimientos de esta categoría');
    expect(mocks.push).toHaveBeenLastCalledWith({
      pathname: '/(app)/report-transactions',
      params: { year: 2026, month: 10, currency: 'COP', category: 'Mercado' },
    });
    expect(content(tree)).toContain('Ver movimientos de esta categoría');
    await press(tree, 'Ver movimientos de gastos');
    expect(mocks.push).toHaveBeenLastCalledWith({
      pathname: '/(app)/report-transactions',
      params: { year: 2026, month: 10, currency: 'COP', category: '' },
    });
  });
  it('keeps archived and negative account balances visible without a misleading distribution', async () => {
    const tree = await render(
      <AccountReport
        data={{
          assetsByCurrency: { COP: 80 },
          accounts: [
            { id: 1, name: 'Archivo', active: false, currency: 'COP', balance: 100 },
            { id: 2, name: 'Negativa', active: true, currency: 'COP', balance: -20 },
          ],
        }}
        currency="COP"
        hidden={false}
      />,
    );
    expect(content(tree)).toContain('Archivada');
    expect(content(tree)).toContain('Hay cuentas con saldo negativo');
    expect(tree.root.findAll((node) => (node.type as unknown) === 'Circle')).toHaveLength(0);
  });
  it('does not turn an incomplete account breakdown into a full distribution', async () => {
    const tree = await render(
      <AccountReport
        data={{
          assetsByCurrency: { COP: 8000 },
          accounts: [{ id: 1, name: 'Principal', currency: 'COP', balance: 4000 }],
        }}
        currency="COP"
        hidden={false}
      />,
    );
    expect(content(tree)).toContain('No hay un desglose completo');
    expect(content(tree)).toContain('8.000');
    expect(tree.root.findAll((node) => (node.type as unknown) === 'Circle')).toHaveLength(0);
  });
  it('refreshes category names in a previously opened report after a rename', async () => {
    function RenameCategory() {
      const update = useUpdateCategory();
      return (
        <Button onPress={() => update.mutate({ id: 7, data: { name: 'Alimentación', version: 0 } })}>
          Renombrar
        </Button>
      );
    }
    const tree = await render(
      <>
        <ReportsScreen />
        <RenameCategory />
      </>,
    );
    await settle(() => expect(content(tree)).toContain('Tu categoría con mayor gasto: Mercado'));
    mocks.patch.mockImplementation(async () => {
      months[10]!.COP!.expensesByCategory = { Alimentación: 200, Transporte: 50 };
      return { data: { id: 7, name: 'Alimentación' } };
    });
    await press(tree, 'Renombrar');
    await settle(() => expect(content(tree)).toContain('Tu categoría con mayor gasto: Alimentación'));
    expect(content(tree)).not.toContain('Tu categoría con mayor gasto: Mercado');
  });
});
