import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  back: vi.fn(),
  push: vi.fn(),
  feedback: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  hidden: false,
  params: { id: '1', contribute: undefined as string | undefined },
}));
vi.mock('react-native', () => {
  const host =
    (name: string) =>
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    }) =>
      React.createElement(
        name,
        props,
        typeof children === 'function' ? children({ pressed: false }) : children,
      );
  const animation = () => ({ start: vi.fn(), stop: vi.fn() });
  return {
    Alert: { alert: mocks.alert },
    ActivityIndicator: host('ActivityIndicator'),
    KeyboardAvoidingView: host('KeyboardAvoidingView'),
    Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? children : null,
    Pressable: host('Pressable'),
    ScrollView: host('ScrollView'),
    Text: host('Text'),
    TextInput: host('TextInput'),
    View: host('View'),
    RefreshControl: host('RefreshControl'),
    StyleSheet: { create: (styles: object) => styles },
    Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
    Animated: {
      View: host('AnimatedView'),
      Value: class {
        setValue() {}
        interpolate() {
          return 1;
        }
      },
      timing: animation,
      spring: animation,
    },
  };
});
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: (props: object) => React.createElement('Icon', props),
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  SafeAreaView: ({ children }: React.PropsWithChildren) =>
    React.createElement('SafeAreaView', undefined, children),
}));
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: React.PropsWithChildren) =>
    React.createElement('Gradient', undefined, children),
}));
vi.mock('@react-native-community/datetimepicker', () => ({
  default: (props: object) => React.createElement('DateTimePicker', props),
}));
vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  router: { push: mocks.push, back: mocks.back },
  useLocalSearchParams: () => mocks.params,
  Redirect: () => null,
  Tabs: Object.assign(
    ({ children }: React.PropsWithChildren) => React.createElement('Tabs', undefined, children),
    { Screen: (props: object) => React.createElement('TabRoute', props) },
  ),
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write }));
vi.mock('@/auth/auth-provider', () => ({
  api: { get: mocks.get, post: mocks.post },
  useAuth: () => ({ state: { status: 'authenticated' } }),
}));
vi.mock('@/privacy/privacy-provider', () => ({ usePrivacy: () => ({ hidden: mocks.hidden }) }));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.feedback }) }));

import CreditsScreen from '@/app/(app)/credits';
import CreditForm from '@/app/(app)/credit-form';
import CreditDetail from '@/app/(app)/credit-detail';
import AppLayout from '@/app/(app)/_layout';
import { CreditCard, CreditPlanView, CreditSimulationView } from './credit-components';
import { CreditPaymentForm } from './credit-payment-form';
import { CreditSimulationForm } from './credit-simulation-form';
import type { Credit } from '@/features/secondary/secondary-api';

import { ApiError } from '@/api/errors';

const base: Credit = {
  id: 1,
  name: 'Vehículo de prueba',
  principal: 1000,
  remainingBalance: 750,
  paidPrincipal: 250,
  paidInterest: 20,
  annualRate: 18.4,
  termMonths: 12,
  paymentDay: 15,
  disbursementDate: '2026-01-01',
  currency: 'COP',
  status: 'ACTIVE',
  nextPaymentDate: '2026-09-15',
  expectedPaymentAmount: 80,
  version: 1,
};
let client: QueryClient;
let trees: ReturnType<typeof create>[];
let credits: Credit[];
function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join('');
  if (value && typeof value === 'object' && 'children' in value) return text(value.children);
  return '';
}
async function flush(check: () => void = () => undefined) {
  await act(async () => {
    await vi.waitFor(check);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function render(child: React.ReactNode) {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<QueryClientProvider client={client}>{child}</QueryClientProvider>);
  });
  trees.push(tree);
  await flush();
  return tree;
}
function button(tree: ReturnType<typeof create>, label: string) {
  const item = tree.root
    .findAll((node) => (node.type as unknown) === 'Pressable')
    .find((node) => node.props.accessibilityLabel === label || text(node) === label);
  expect(item, label).toBeDefined();
  return item!;
}
async function press(tree: ReturnType<typeof create>, label: string) {
  await act(async () => {
    button(tree, label).props.onPress();
  });
  await flush();
}
async function fill(tree: ReturnType<typeof create>, label: string, value: string) {
  await act(async () => {
    tree.root
      .findAll((node) => (node.type as unknown) === 'TextInput')
      .find((node) => node.props.accessibilityLabel === label)!
      .props.onChangeText(value);
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.hidden = false;
  mocks.params = { id: '1', contribute: undefined };
  credits = [{ ...base }];
  trees = [];
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 3 } },
  });
  const storage = new Map<string, string>();
  mocks.read.mockImplementation(async (key: string) => storage.get(key) ?? null);
  mocks.write.mockImplementation(async (key: string, value: string) => {
    storage.set(key, value);
  });
  mocks.get.mockImplementation(async (url: string) => {
    if (url === '/credits') return { data: [...credits] };
    if (url === '/credits/1') return { data: credits[0] };
    if (url === '/credits/1/plan-vs-real')
      return {
        data: {
          plannedTotalToDate: 400,
          realTotalPaid: 270,
          plannedCapitalPaid: 350,
          realCapitalPaid: 250,
          plannedInstallments: 4,
          realInstallments: 3,
          status: 'ATRASADO',
        },
      };
    if (url === '/accounts')
      return {
        data: [
          { id: 2, name: 'Cuenta de prueba', active: true, currency: 'COP' },
          { id: 3, name: 'Dólares', active: true, currency: 'USD' },
        ],
      };
    if (url.startsWith('/dashboard')) return { data: { accounts: [{ id: 2, balance: 555 }] } };
    if (url === '/me') return { data: { id: 10, name: 'Ana' } };
    if (url === '/alerts') return { data: [] };
    throw Error(`Unexpected GET ${url}`);
  });
  mocks.post.mockImplementation(async (url: string) => {
    if (url.endsWith('/simulate'))
      return {
        data: {
          installmentValue: 88,
          totalInterest: 56,
          totalPaid: 1056,
          savedInstallments: 2,
          remainingInstallments: 10,
        },
      };
    if (url.endsWith('/reverse')) {
      credits = [{ ...base }];
      return {
        data: {
          paymentId: 9,
          paymentStatus: 'REVERSED',
          status: 'ACTIVE',
          totalAmount: 750,
          newBalance: 750,
        },
      };
    }
    if (url.endsWith('/payments')) {
      credits = [{ ...base, remainingBalance: 0, paidPrincipal: 1000, status: 'PAID' }];
      return {
        data: { paymentId: 9, paymentStatus: 'POSTED', status: 'PAID', totalAmount: 750, newBalance: 0 },
      };
    }
    if (url === '/credits') return { data: { ...base, id: 2 } };
    throw Error(`Unexpected POST ${url}`);
  });
});
afterEach(async () => {
  for (const tree of trees) await act(async () => tree.unmount());
  client.clear();
  vi.unstubAllGlobals();
});

describe('Credit screens with real hooks and forms', () => {
  it('connects the list and detail back buttons', async () => {
    const list = await render(<CreditsScreen />);
    await press(list, 'Volver');
    const detail = await render(<CreditDetail />);
    await press(detail, 'Volver');
    expect(mocks.back).toHaveBeenCalledTimes(2);
  });
  it('renders backend statuses in ordered groups with independent currencies', async () => {
    credits = [
      { ...base },
      { ...base, id: 2, name: 'Atrasado USD', currency: 'USD', status: 'LATE', remainingBalance: 10 },
      { ...base, id: 3, status: 'PAID', remainingBalance: 0 },
    ];
    const tree = await render(<CreditsScreen />);
    const ui = text(tree.toJSON());
    expect(ui).toContain('750 COP');
    expect(ui).toContain('10 USD');
    expect(ui.indexOf('Activos')).toBeLessThan(ui.indexOf('Atrasados'));
    expect(ui).toContain('Pagados');
    expect(ui).not.toContain('Al día');
    await press(tree, 'Agregar crédito');
    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(app)/credit-form',
        params: expect.objectContaining({ id: '', formSession: expect.any(String) }),
      }),
    );
  });
  it('has exactly one CTA in the useful empty state', async () => {
    credits = [];
    const tree = await render(<CreditsScreen />);
    expect(text(tree.toJSON())).toContain('Tus deudas, bajo control');
    expect(
      tree.root.findAll((n) => (n.type as unknown) === 'Pressable' && text(n) === 'Agregar crédito'),
    ).toHaveLength(1);
  });
  it('card never invents balance, rate, currency, date or progress', async () => {
    const tree = await render(
      <CreditCard credit={{ id: 1, name: 'Sin datos' }} hidden={false} onPress={vi.fn()} />,
    );
    expect(text(tree.toJSON())).toContain('No disponible');
    expect(text(tree.toJSON())).not.toMatch(/COP|EA|Próximo|0%/);
  });
  it('masks card and list amounts and accessibility labels', async () => {
    mocks.hidden = true;
    const tree = await render(<CreditsScreen />);
    expect(text(tree.toJSON())).not.toContain('750');
    expect(text(tree.toJSON())).toContain('18.4');
    expect(
      tree.root
        .findAll((n) => (n.type as unknown) === 'Pressable')
        .some((n) => String(n.props.accessibilityLabel).includes('750')),
    ).toBe(false);
  });
  it('shows real detail and accessible capital progress', async () => {
    const tree = await render(<CreditDetail />);
    const ui = text(tree.toJSON());
    expect(ui).toContain('750 COP');
    expect(ui).toContain('18.4%');
    expect(ui).toContain('15 de septiembre de 2026');
    expect(ui).toContain('80 COP');
    expect(
      tree.root.findAll((n) => n.props.accessibilityRole === 'progressbar')[0]?.props.accessibilityValue.now,
    ).toBe(25);
  });
  it('paid detail omits payment CTA and does not celebrate a historical record', async () => {
    credits = [{ ...base, status: 'PAID', remainingBalance: 0, paidPrincipal: 1000 }];
    const tree = await render(<CreditDetail />);
    expect(text(tree.toJSON())).toContain('Esta deuda ya está completada.');
    expect(text(tree.toJSON())).not.toContain('Registrar pago');
    expect(text(tree.toJSON())).not.toContain('Cerraste esta deuda');
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('keeps the confirmed paid balance when the following GET fails', async () => {
    const tree = await render(<CreditDetail />);
    const get = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === '/credits/1') throw new ApiError('offline', null, null, null, null, {});
      return get(url);
    });
    await press(tree, 'Registrar pago');
    await fill(tree, 'Monto del pago', '750');
    await press(tree, 'Confirmar pago');
    const updated = client.getQueryData<Credit>(['credits', 1]);
    expect(updated?.status).toBe('PAID');
    expect(updated?.remainingBalance).toBe(0);
    expect(updated?.paidPrincipal).toBeUndefined();
    expect(updated?.expectedPaymentAmount).toBeUndefined();
    expect(text(tree.toJSON())).not.toContain('Registrar pago');
    expect(mocks.feedback).toHaveBeenCalledWith('Pago registrado', 'success');
  });
  it('creates with zero EA, exact request and no automatic account', async () => {
    client.setQueryData(['credits'], [base]);
    const tree = await render(<CreditForm />);
    await fill(tree, 'Nombre del crédito', 'Estudios');
    await fill(tree, 'Principal original', '1000');
    await fill(tree, 'Tasa efectiva anual (EA)', '0');
    await fill(tree, 'Plazo en meses', '12');
    await fill(tree, 'Día de pago', '15');
    await press(tree, 'Registrar crédito');
    expect(mocks.post).toHaveBeenCalledWith(
      '/credits',
      expect.objectContaining({
        name: 'Estudios',
        principal: 1000,
        annualRate: 0,
        termMonths: 12,
        currency: 'COP',
      }),
    );
    expect(mocks.post.mock.calls[0]?.[1]).not.toHaveProperty('disbursementAccountId');
    expect(mocks.back).toHaveBeenCalled();
    expect(client.getQueryData<Credit[]>(['credits'])?.map((credit) => credit.id)).toEqual([1, 2]);
  });
  it('payment posts once despite immediate double presses and invalidates each affected query once', async () => {
    const tree = await render(<CreditDetail />);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await press(tree, 'Registrar pago');
    await fill(tree, 'Monto del pago', '750');
    const confirm = button(tree, 'Confirmar pago');
    await act(async () => {
      confirm.props.onPress();
      confirm.props.onPress();
    });
    await flush(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    await flush();
    expect(mocks.post).toHaveBeenCalledWith('/credits/1/payments', expect.objectContaining({ amount: 750 }));
    expect(client.getMutationCache().getAll()[0]?.options.retry).toBe(false);
    expect(invalidate.mock.calls.map((call) => call[0])).toEqual([
      { queryKey: ['credits'], exact: true },
      { queryKey: ['credits', 1], exact: true },
      { queryKey: ['credits', 1, 'plan'], exact: true },
      { queryKey: ['accounts'] },
      { queryKey: ['dashboard'] },
      { queryKey: ['transactions'] },
      { queryKey: ['alerts'] },
    ]);
    expect(text(tree.toJSON())).toContain('Cerraste esta deuda por completo.');
    expect(mocks.feedback).toHaveBeenCalledWith('Pago registrado', 'success');
  });
  it('preserves payment values and blocks repeat after unknown outcome', async () => {
    mocks.post.mockRejectedValue(new ApiError('offline', null, null, null, null, {}));
    const tree = await render(
      <CreditPaymentForm credit={base} visible onClose={vi.fn()} onReview={vi.fn()} onSaved={vi.fn()} />,
    );
    await fill(tree, 'Monto del pago', '123');
    await press(tree, 'Confirmar pago');
    expect(text(tree.toJSON())).toContain('No pudimos confirmar la operación');
    expect(button(tree, 'Confirmar pago').props.disabled).toBe(true);
    await press(tree, 'Confirmar pago');
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(
      tree.root
        .findAll((n) => (n.type as unknown) === 'TextInput')
        .find((n) => n.props.accessibilityLabel === 'Monto del pago')?.props.value,
    ).toBe('123');
  });
  it('applies backend field errors without clearing amount', async () => {
    mocks.post.mockRejectedValue(
      new ApiError('invalid', 400, null, null, null, { amount: 'Revisa el monto del pago.' }),
    );
    const tree = await render(
      <CreditPaymentForm credit={base} visible onClose={vi.fn()} onReview={vi.fn()} onSaved={vi.fn()} />,
    );
    await fill(tree, 'Monto del pago', '123');
    await press(tree, 'Confirmar pago');
    expect(text(tree.toJSON())).toContain('Revisa el monto del pago.');
    expect(button(tree, 'Confirmar pago').props.disabled).toBe(false);
  });
  it('selects only an active matching account with backend balance', async () => {
    const tree = await render(
      <CreditPaymentForm credit={base} visible onClose={vi.fn()} onReview={vi.fn()} onSaved={vi.fn()} />,
    );
    await press(tree, 'Sin vincular una cuenta');
    expect(text(tree.toJSON())).toContain('555');
    expect(text(tree.toJSON())).not.toContain('Dólares');
    const option = tree.root
      .findAll((n) => (n.type as unknown) === 'Pressable')
      .find((n) => text(n).startsWith('Cuenta de prueba'))!;
    await act(async () => option.props.onPress({ stopPropagation() {} }));
    await fill(tree, 'Monto del pago', '100');
    await press(tree, 'Confirmar pago');
    expect(mocks.post).toHaveBeenCalledWith('/credits/1/payments', expect.objectContaining({ accountId: 2 }));
  });
  it('confirms reversal, can cancel, reverses identifiable payment and disables further reversal', async () => {
    const tree = await render(<CreditDetail />);
    await press(tree, 'Registrar pago');
    await fill(tree, 'Monto del pago', '750');
    await press(tree, 'Confirmar pago');
    await press(tree, 'Continuar');
    await press(tree, 'Revertir pago');
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.alert).toHaveBeenCalledWith(
      '¿Revertir este pago?',
      'Se restaurará el efecto financiero de la operación y el historial se conservará.',
      expect.arrayContaining([expect.objectContaining({ text: 'Cancelar', style: 'cancel' })]),
    );
    await act(async () => {
      await mocks.alert.mock.calls[0]?.[2][1].onPress();
    });
    await flush();
    expect(mocks.post).toHaveBeenLastCalledWith('/credits/1/payments/9/reverse');
    expect(text(tree.toJSON())).toContain('Pago revertido');
    expect(text(tree.toJSON())).not.toContain('Revertir pago');
  });
  it.each([true, false])(
    'handles reversal conflict without mislabeling other errors: %s',
    async (already) => {
      const tree = await render(<CreditDetail />);
      await press(tree, 'Registrar pago');
      await fill(tree, 'Monto del pago', '750');
      await press(tree, 'Confirmar pago');
      await press(tree, 'Continuar');
      mocks.post.mockRejectedValue(
        new ApiError(already ? 'El pago ya fue revertido' : 'Otro conflicto', 409, null, null, null, {}),
      );
      await press(tree, 'Revertir pago');
      await act(async () => {
        await mocks.alert.mock.calls[0]?.[2][1].onPress();
      });
      await flush();
      expect(text(tree.toJSON()).includes('Este pago ya fue revertido.')).toBe(already);
      expect(mocks.post).toHaveBeenCalledTimes(2);
    },
  );
  it('plan and simulation output respect privacy and omit absent metrics', async () => {
    const plan = await render(
      <CreditPlanView
        plan={{ plannedTotalToDate: 789, realTotalPaid: 456, realInstallments: 2 }}
        currency="USD"
        hidden
      />,
    );
    expect(text(plan.toJSON())).toContain('Planeado');
    expect(text(plan.toJSON())).toContain('Real');
    expect(text(plan.toJSON())).not.toMatch(/789|456/);
    const scenario = await render(
      <CreditSimulationView
        result={{ installmentValue: 1234, savedInstallments: 3 }}
        currency="USD"
        hidden
      />,
    );
    expect(text(scenario.toJSON())).not.toContain('1234');
    expect(text(scenario.toJSON())).toContain('Cuotas ahorradas3');
    expect(text(scenario.toJSON())).not.toContain('Intereses totales');
  });
  it('simulates extras through the backend without invalidating or persisting credit and clears outdated output', async () => {
    const tree = await render(<CreditSimulationForm credit={base} onClose={vi.fn()} />);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await fill(tree, 'Monto adicional (opcional)', '100');
    await fill(tree, 'Número de cuota para el abono', '3');
    await press(tree, 'Simular escenario');
    expect(mocks.post).toHaveBeenCalledWith(
      '/credits/1/simulate',
      expect.objectContaining({ principal: 1000, annualRate: 18.4, extraPayments: { '3': 100 } }),
    );
    expect(text(tree.toJSON())).toContain('Escenario simulado');
    expect(text(tree.toJSON())).toContain('88 COP');
    expect(invalidate).not.toHaveBeenCalled();
    expect(credits[0]).toEqual(base);
    await fill(tree, 'Monto adicional (opcional)', '200');
    expect(text(tree.toJSON())).not.toContain('Escenario simulado');
  });
  it('keeps credits internal routes hidden and four primary tabs', async () => {
    const tree = await render(<AppLayout />);
    const routes = tree.root.findAll((n) => (n.type as unknown) === 'TabRoute');
    expect(routes.filter((n) => n.props.options?.href !== null).map((n) => n.props.name)).toEqual([
      'index',
      'transactions',
      'accounts',
      'more',
    ]);
    for (const name of ['credits', 'credit-form', 'credit-detail'])
      expect(routes.find((n) => n.props.name === name)?.props.options.href).toBeNull();
  });
});

it('clears payment fields and mutation errors after closing the retained modal', async () => {
  mocks.post.mockRejectedValue(
    new ApiError('invalid', 400, null, null, null, { amount: 'Revisa el monto del pago.' }),
  );
  const onClose = vi.fn();
  const tree = await render(
    <CreditPaymentForm credit={base} visible onClose={onClose} onReview={vi.fn()} onSaved={vi.fn()} />,
  );
  await fill(tree, 'Monto del pago', '123');
  await press(tree, 'Confirmar pago');
  expect(text(tree.toJSON())).toContain('Revisa el monto del pago.');
  await press(tree, 'Volver');
  expect(onClose).toHaveBeenCalledOnce();
  expect(text(tree.toJSON())).not.toContain('Revisa el monto del pago.');
  expect(
    tree.root
      .findAll((n) => (n.type as unknown) === 'TextInput')
      .find((n) => n.props.accessibilityLabel === 'Monto del pago')?.props.value,
  ).toBe('');
  expect(button(tree, 'Confirmar pago').props.disabled).toBe(false);
});

import { FinancialDateField } from '@/ui/financial-date-field';
import { localDateFromNative } from '@/utils/local-date';
it('blocks future payments before the API, clears the date error on edit and accepts today', async () => {
  const tree = await render(
    <CreditPaymentForm credit={base} visible onClose={vi.fn()} onReview={vi.fn()} onSaved={vi.fn()} />,
  );
  expect(text(tree.toJSON())).toContain('Registra un pago que ya hayas realizado.');
  expect(text(tree.toJSON())).toContain('Este valor forma parte del monto total del pago.');
  await fill(tree, 'Monto del pago', '123');
  const field = tree.root.findByType(FinancialDateField);
  expect(field.props.maximumDate).toBe(localDateFromNative(new Date()));
  await act(async () => field.props.onChange('2099-12-31'));
  await press(tree, 'Confirmar pago');
  expect(mocks.post).not.toHaveBeenCalled();
  expect(text(tree.toJSON())).toContain('La fecha del pago no puede ser futura.');
  await act(async () => field.props.onChange(localDateFromNative(new Date())));
  expect(text(tree.toJSON())).not.toContain('La fecha del pago no puede ser futura.');
  await press(tree, 'Confirmar pago');
  expect(mocks.post).toHaveBeenCalledWith(
    '/credits/1/payments',
    expect.objectContaining({ paymentDate: localDateFromNative(new Date()) }),
  );
});
it('accepts a past payment date and keeps the ISO request unchanged', async () => {
  const tree = await render(
    <CreditPaymentForm credit={base} visible onClose={vi.fn()} onReview={vi.fn()} onSaved={vi.fn()} />,
  );
  await fill(tree, 'Monto del pago', '123');
  await act(async () => tree.root.findByType(FinancialDateField).props.onChange('2026-01-02'));
  expect(text(tree.toJSON())).toContain('2 de enero de 2026');
  await press(tree, 'Confirmar pago');
  expect(mocks.post).toHaveBeenCalledWith(
    '/credits/1/payments',
    expect.objectContaining({ paymentDate: '2026-01-02' }),
  );
});
it.each([400, 422, null])(
  'clears rejected errors but preserves uncertain outcomes after editing (%s)',
  async (status) => {
    mocks.post.mockRejectedValue(
      new ApiError(
        'Rejected',
        status,
        null,
        null,
        null,
        status === null ? {} : { amount: 'Revisa el importe.' },
      ),
    );
    const tree = await render(
      <CreditPaymentForm credit={base} visible onClose={vi.fn()} onReview={vi.fn()} onSaved={vi.fn()} />,
    );
    await fill(tree, 'Monto del pago', '123');
    await press(tree, 'Confirmar pago');
    await fill(tree, 'Monto del pago', '124');
    if (status === null) {
      expect(text(tree.toJSON())).toContain('No pudimos confirmar la operación');
      expect(button(tree, 'Confirmar pago').props.disabled).toBe(true);
      await press(tree, 'Confirmar pago');
      expect(mocks.post).toHaveBeenCalledOnce();
    } else {
      expect(text(tree.toJSON())).not.toContain('Revisa el importe.');
      expect(text(tree.toJSON())).not.toContain('No pudimos completar la operación');
      expect(button(tree, 'Confirmar pago').props.disabled).toBe(false);
    }
  },
);

import { TransactionFiltersModal } from '@/features/transactions/transaction-filters-modal';
it('uses filtering copy for empty categories without a create action', async () => {
  const original = mocks.get.getMockImplementation()!;
  mocks.get.mockImplementation((url: string, ...args: unknown[]) =>
    url === '/categories' ? Promise.resolve({ data: [] }) : original(url, ...args),
  );
  const tree = await render(
    <TransactionFiltersModal visible filters={{}} onClose={vi.fn()} onApply={vi.fn()} onClear={vi.fn()} />,
  );
  await flush();
  await press(tree, 'Categoría');
  expect(text(tree.toJSON())).toContain('No hay categorías disponibles');
  expect(text(tree.toJSON())).toContain('Aún no tienes categorías para usar como filtro.');
  expect(text(tree.toJSON())).not.toContain('Crea una opción');
});

it('keeps advanced simulation values when collapsing and sends the edited scenario', async () => {
  const tree = await render(<CreditSimulationForm credit={base} onClose={vi.fn()} />);
  const inputs = () => tree.root.findAll((n) => (n.type as unknown) === 'TextInput');
  expect(inputs().some((n) => n.props.accessibilityLabel === 'Principal original')).toBe(false);
  await press(tree, '+ Modificar condiciones del escenario');
  await fill(tree, 'Principal original', '2000');
  await press(tree, '− Modificar condiciones del escenario');
  expect(inputs().some((n) => n.props.accessibilityLabel === 'Principal original')).toBe(false);
  await press(tree, 'Simular escenario');
  expect(mocks.post).toHaveBeenCalledWith(
    '/credits/1/simulate',
    expect.objectContaining({ principal: 2000, annualRate: 18.4, termMonths: 12 }),
  );
  await press(tree, '+ Modificar condiciones del escenario');
  expect(inputs().find((n) => n.props.accessibilityLabel === 'Principal original')?.props.value).toBe(
    '2.000',
  );
});
it.each([true, false])(
  'uses a compact credit create action only with existing content: %s',
  async (existing) => {
    credits = existing ? [{ ...base }] : [];
    const tree = await render(<CreditsScreen />);
    expect(text(button(tree, 'Agregar crédito'))).toBe(existing ? '+ Nuevo' : 'Agregar crédito');
    await press(tree, 'Agregar crédito');
    expect(mocks.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(app)/credit-form' }));
  },
);
it('keeps selected filter choices visible and applies the unchanged selection', async () => {
  const onApply = vi.fn();
  const filters = { type: 'EXPENSE' as const, status: 'POSTED' as const, month: 9, year: 2026, accountId: 1 };
  const tree = await render(
    <TransactionFiltersModal
      visible
      filters={filters}
      onApply={onApply}
      onClose={vi.fn()}
      onClear={vi.fn()}
    />,
  );
  await press(tree, 'Tipo');
  const selected = tree.root
    .findAll((n) => (n.type as unknown) === 'Pressable')
    .find((n) => n.props.accessibilityState?.selected);
  expect(text(selected)).toBe('Gasto');
  await act(async () => {
    selected!.props.onPress({ stopPropagation: vi.fn() });
  });
  await press(tree, 'Aplicar filtros');
  expect(onApply).toHaveBeenCalledWith(filters);
});
