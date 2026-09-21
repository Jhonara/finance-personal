import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  push: vi.fn(),
  feedback: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  hidden: false,
  params: { id: '1' } as Record<string, string>,
}));

// Keep the screens, query observers and mutations real; replace only native hosts and I/O.
vi.mock('react-native', () => {
  const primitive =
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
    ActivityIndicator: primitive('ActivityIndicator'),
    useWindowDimensions: () => ({ width: 360, height: 640 }),
    KeyboardAvoidingView: primitive('KeyboardAvoidingView'),
    Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? children : null,
    Pressable: primitive('Pressable'),
    ScrollView: primitive('ScrollView'),
    Text: primitive('Text'),
    TextInput: primitive('TextInput'),
    View: primitive('View'),
    RefreshControl: primitive('RefreshControl'),
    StyleSheet: { create: (styles: object) => styles },
    Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
    Animated: {
      View: primitive('AnimatedView'),
      Value: class {
        setValue() {}
        interpolate() {
          return 1;
        }
      },
      timing: animation,
      stagger: animation,
      spring: animation,
    },
    Easing: { out: () => undefined, cubic: () => undefined },
  };
});
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: (props: object) => React.createElement('Icon', props),
}));
vi.mock('@react-native-community/datetimepicker', () => ({
  default: () => null,
  DateTimePickerAndroid: { open: vi.fn() },
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
vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  router: { push: mocks.push, back: vi.fn() },
  useLocalSearchParams: () => mocks.params,
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write }));
vi.mock('@/auth/auth-provider', () => ({ api: { get: mocks.get, post: mocks.post, patch: mocks.patch } }));
vi.mock('@/privacy/privacy-provider', () => ({
  usePrivacy: () => ({ hidden: mocks.hidden, toggle: vi.fn() }),
}));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.feedback }) }));

import AccountForm from '@/app/(app)/account-form';
import BudgetForm from '@/app/(app)/budget-form';
import SavingForm from '@/app/(app)/saving-form';
import { Input, MoneyInput, SelectField, Button } from '@/ui/primitives';
import { ModalSelector } from '@/ui/modal-selector';
import { openForm } from '@/features/forms/form-session';
import { ApiError } from '@/api/errors';
import AccountsScreen from '@/app/(app)/accounts';
import AccountDetail from '@/app/(app)/account-detail';
import HomeScreen from '@/app/(app)/index';
import TransactionsScreen from '@/app/(app)/transactions';
import { FinancialProgressSection, ProgressSignal } from '@/features/progress/progress-signal';
import { financialProgress } from '@/features/progress/financial-progress';
import { secondaryKeys } from '@/features/secondary/use-secondary';
import { AccountCard } from '@/ui/financial';
import { GuidedSetupCard } from '@/ui/guided-setup-card';
import { useCreateBudget } from './secondary/use-secondary';
import { dashboardKeys } from './dashboard/use-dashboard-month';
import { currentDashboardPeriod } from './dashboard/dashboard-period';
import { currentUserKeys } from './profile/profile-keys';
import { firstRunStorage } from './onboarding/first-run-storage';
import { formatPrivateMoney } from '@/privacy/privacy-format';
import type { DashboardMonth } from '@/api/dashboard-api';

const period = currentDashboardPeriod();
const dashboardKey = dashboardKeys.month(period);
const account = {
  id: 1,
  name: 'Principal',
  type: 'CASH' as const,
  active: true,
  currency: 'COP',
  version: 1,
};
let dashboard: DashboardMonth;
let stored: Map<string, string>;
let client: QueryClient;
let trees: ReturnType<typeof create>[];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (value && typeof value === 'object' && 'children' in value) return textContent(value.children);
  return '';
}

async function render(children: React.ReactNode) {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  });
  trees.push(tree);
  return tree;
}

async function settled(check: () => void) {
  await act(async () => {
    await vi.waitFor(check);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
}

function press(tree: ReturnType<typeof create>, label: string) {
  const button = tree.root
    .findAll((node) => (node.type as unknown) === 'Pressable')
    .find((node) => node.props.accessibilityLabel === label || textContent(node) === label);
  expect(button, label).toBeDefined();
  button!.props.onPress();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.hidden = false;
  mocks.params = { id: '1' };
  trees = [];
  stored = new Map();
  dashboard = { accounts: [{ ...account, balance: 110000 }], budgets: { items: [] } };
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  mocks.read.mockImplementation(async (key: string) => {
    if (!/^[\w.-]+$/.test(key)) throw new Error('Invalid SecureStore key');
    return key.includes('.intro.') ? 'done' : (stored.get(key) ?? null);
  });
  mocks.write.mockImplementation(async (key: string, value: string) => {
    if (!/^[\w.-]+$/.test(key)) throw new Error('Invalid SecureStore key');
    stored.set(key, value);
  });
  mocks.get.mockImplementation(async (url: string) => {
    if (url === '/accounts') return { data: [account] };
    if (url === '/dashboard/month') return { data: dashboard };
    if (url === '/me') return { data: { id: 10, name: 'Ana' } };
    if (url === '/transactions') return { data: { totalElements: 1 } };
    throw new Error(`Unexpected GET ${url}`);
  });
  mocks.patch.mockResolvedValue({ data: account });
});

afterEach(async () => {
  await act(async () => {
    trees.forEach((tree) => tree.unmount());
  });
  client.clear();
  vi.unstubAllGlobals();
});

describe.each([
  ['Accounts', AccountsScreen],
  ['Account Detail', AccountDetail],
] as const)('%s balance behavior', (_label, Screen) => {
  it('keeps account information visible with a skeleton until Dashboard resolves', async () => {
    const request = deferred<{ data: DashboardMonth }>();
    mocks.get.mockImplementation(async (url: string) =>
      url === '/dashboard/month'
        ? request.promise
        : { data: url === '/accounts' ? [account] : { totalElements: 1 } },
    );
    const tree = await render(<Screen />);
    await settled(() => expect(client.getQueryData(['accounts', 'list'])).toBeDefined());
    expect(textContent(tree.toJSON())).toContain('Principal');
    expect(textContent(tree.toJSON())).not.toContain(formatPrivateMoney(0, 'COP', false));
    expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Cargando').length).toBeGreaterThan(
      0,
    );
    await act(async () => {
      request.resolve({ data: dashboard });
    });
    await settled(() => expect(client.getQueryData(dashboardKey)).toBeDefined());
    expect(textContent(tree.toJSON())).toContain(formatPrivateMoney(110000, 'COP', false));
  });

  it('shows human copy after Dashboard failure and preserves account actions', async () => {
    mocks.get.mockImplementation(async (url: string) => {
      if (url === '/dashboard/month') throw new Error('Internal server failure');
      return { data: url === '/accounts' ? [account] : { totalElements: 1 } };
    });
    const tree = await render(<Screen />);
    await settled(() => expect(client.getQueryState(dashboardKey)?.status).toBe('error'));
    expect(textContent(tree.toJSON())).toContain('Saldo no disponible');
    expect(textContent(tree.toJSON())).not.toContain(formatPrivateMoney(0, 'COP', false));
    expect(textContent(tree.toJSON())).not.toContain('Internal server failure');
    if (Screen === AccountsScreen) {
      await act(async () => {
        tree.root.findByType(AccountCard).props.onPress();
      });
      expect(mocks.push).toHaveBeenCalledWith({
        pathname: '/(app)/account-detail',
        params: expect.objectContaining({ id: '1', formSession: expect.any(String) }),
      });
    } else {
      await act(async () => {
        press(tree, 'Editar cuenta');
      });
      await act(async () => press(tree, 'Guardar cambios'));
      await settled(() =>
        expect(mocks.patch).toHaveBeenCalledWith(
          '/accounts/1',
          expect.objectContaining({ name: 'Principal' }),
        ),
      );
    }
  });

  it('keeps the cached amount through a pending and failed refetch', async () => {
    const tree = await render(<Screen />);
    await settled(() => expect(client.getQueryData(dashboardKey)).toBeDefined());
    const request = deferred<{ data: DashboardMonth }>();
    mocks.get.mockImplementation(async () => request.promise);
    await act(async () => {
      void client.invalidateQueries({ queryKey: dashboardKeys.all });
    });
    expect(client.getQueryState(dashboardKey)?.fetchStatus).toBe('fetching');
    expect(textContent(tree.toJSON())).toContain(formatPrivateMoney(110000, 'COP', false));
    expect(textContent(tree.toJSON())).not.toContain(formatPrivateMoney(0, 'COP', false));
    await act(async () => {
      request.reject(new Error('Offline'));
    });
    await settled(() => expect(client.getQueryState(dashboardKey)?.status).toBe('error'));
    expect(textContent(tree.toJSON())).toContain(formatPrivateMoney(110000, 'COP', false));
    expect(textContent(tree.toJSON())).not.toContain('Saldo no disponible');
  });

  it('masks known amounts including accessibility labels when privacy is active', async () => {
    mocks.hidden = true;
    const tree = await render(<Screen />);
    await settled(() => expect(client.getQueryData(dashboardKey)).toBeDefined());
    expect(textContent(tree.toJSON())).toContain('$ ••••••');
    expect(JSON.stringify(tree.toJSON())).not.toContain('110.000');
  });

  it('renders a real zero only when supplied by Dashboard', async () => {
    dashboard = { accounts: [{ ...account, balance: 0 }] };
    const tree = await render(<Screen />);
    await settled(() => expect(client.getQueryData(dashboardKey)).toBeDefined());
    expect(textContent(tree.toJSON())).toContain(formatPrivateMoney(0, 'COP', false));
    expect(textContent(tree.toJSON())).not.toContain('Saldo no disponible');
  });
});

describe('Home guided setup lifecycle', () => {
  async function home() {
    const tree = await render(<HomeScreen />);
    await settled(() =>
      expect(client.getQueryData(['onboarding', 'ordinary-movement-exists', 'INCOME'])).toBeDefined(),
    );
    return tree;
  }

  function BudgetAction() {
    const mutation = useCreateBudget();
    return (
      <button onClick={() => mutation.mutate({ categoryId: 1, limitAmount: 200000, ...period })}>
        Create budget
      </button>
    );
  }

  it('moves 3/4 to visible 4/4 through budget invalidation without remount, then dismisses immediately and persists', async () => {
    client.setQueryData(['budgets', period.year, period.month], []);
    client.setQueryData(['accounts', 'list'], [account]);
    mocks.post.mockImplementation(async (url: string) => {
      expect(url).toBe('/budgets');
      const budget = { id: 8, categoryName: 'Comida', limitAmount: 200000 };
      dashboard = { ...dashboard, budgets: { items: [budget] } };
      return { data: budget };
    });
    const tree = await render(
      <>
        <HomeScreen />
        <BudgetAction />
      </>,
    );
    await settled(() =>
      expect(client.getQueryData(['onboarding', 'ordinary-movement-exists', 'INCOME'])).toBeDefined(),
    );
    const homeInstance = tree.root.findByType(HomeScreen);
    expect(textContent(tree.toJSON())).toContain('3 de 4 completados');
    await act(async () => {
      tree.root.findByType('button').props.onClick();
    });
    await settled(() =>
      expect(client.getQueryData<DashboardMonth>(dashboardKey)?.budgets?.items).toHaveLength(1),
    );
    expect(client.getQueryState(['budgets', period.year, period.month])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['accounts', 'list'])?.isInvalidated).toBe(false);
    expect(tree.root.findByType(HomeScreen)).toBe(homeInstance);
    expect(tree.root.findByType(GuidedSetupCard).props.completed).toBe(4);
    expect(textContent(tree.toJSON())).toContain('¡Listo! Ya tienes tu base financiera.');
    expect(mocks.write).not.toHaveBeenCalled();

    const save = deferred<void>();
    mocks.write.mockImplementationOnce(async (key: string, value: string) => {
      await save.promise;
      stored.set(key, value);
    });
    await act(async () => {
      press(tree, 'Continuar');
    });
    expect(tree.root.findAllByType(GuidedSetupCard)).toHaveLength(0);
    expect(tree.root.findByType(HomeScreen)).toBe(homeInstance);
    await act(async () => {
      save.resolve();
    });
    expect(stored.get(firstRunStorage.completionKey(10))).toBe('done');

    // A monthly data change must not resurrect an acknowledged setup.
    await act(async () => {
      client.setQueryData(dashboardKey, { ...dashboard, budgets: { items: [] } });
    });
    await settled(() =>
      expect(client.getQueryData<DashboardMonth>(dashboardKey)?.budgets?.items).toHaveLength(0),
    );
    expect(tree.root.findAllByType(GuidedSetupCard)).toHaveLength(0);
    const remounted = await home();
    expect(remounted.root.findAllByType(GuidedSetupCard)).toHaveLength(0);
  });

  it('keeps completion visible until Continue and isolates dismissal by user', async () => {
    dashboard = { ...dashboard, budgets: { items: [{ id: 8 }] } };
    stored.set(firstRunStorage.completionKey(10), 'done');
    const tree = await home();
    expect(tree.root.findAllByType(GuidedSetupCard)).toHaveLength(0);
    await act(async () => {
      client.setQueryData(currentUserKeys.current(), { id: 11, name: 'Luis' });
    });
    await settled(() => expect(mocks.read).toHaveBeenCalledWith(firstRunStorage.completionKey(11)));
    expect(textContent(tree.toJSON())).toContain('¡Listo! Ya tienes tu base financiera.');
    expect(stored.has(firstRunStorage.completionKey(11))).toBe(false);
    await act(async () => {
      press(tree, 'Continuar');
    });
    expect(tree.root.findAllByType(GuidedSetupCard)).toHaveLength(0);
    expect(stored.get(firstRunStorage.completionKey(11))).toBe('done');
    expect(stored.get(firstRunStorage.completionKey(10))).toBe('done');
  });

  it('allows retry if completion could not be persisted', async () => {
    dashboard = { ...dashboard, budgets: { items: [{ id: 8 }] } };
    const tree = await home();
    mocks.write.mockRejectedValueOnce(new Error('Storage unavailable'));
    await act(async () => {
      press(tree, 'Continuar');
    });
    expect(tree.root.findAllByType(GuidedSetupCard)).toHaveLength(1);
    expect(mocks.feedback).toHaveBeenCalledWith(
      'No pudimos guardar tu avance. Pulsa Continuar para reintentar.',
    );
    await act(async () => {
      press(tree, 'Continuar');
    });
    expect(tree.root.findAllByType(GuidedSetupCard)).toHaveLength(0);
    expect(stored.get(firstRunStorage.completionKey(10))).toBe('done');
  });

  it('ignores a previous user storage read that resolves after the user changes', async () => {
    const oldRead = deferred<string | null>();
    mocks.read.mockImplementation(async (key: string) =>
      key === firstRunStorage.completionKey(10) ? oldRead.promise : 'done',
    );
    const tree = await home();
    await act(async () => {
      client.setQueryData(currentUserKeys.current(), { id: 11, name: 'Luis' });
    });
    await settled(() => expect(mocks.read).toHaveBeenCalledWith(firstRunStorage.completionKey(11)));
    await act(async () => {
      oldRead.resolve(null);
    });
    expect(tree.root.findAllByType(GuidedSetupCard)).toHaveLength(0);
  });
});

async function reenter(
  tree: ReturnType<typeof create>,
  Screen: React.ComponentType,
  params: Record<string, string>,
) {
  mocks.params = params;
  await act(async () => {
    tree.update(
      <QueryClientProvider client={client}>
        <Screen />
      </QueryClientProvider>,
    );
  });
}
function input(tree: ReturnType<typeof create>, label: string) {
  return [...tree.root.findAllByType(Input), ...tree.root.findAllByType(MoneyInput)].find(
    (node) => node.props.label === label,
  )!;
}
const cases = [
  {
    name: 'Account',
    Screen: AccountForm,
    label: 'Nombre',
    value: 'Cuenta A',
    submit: 'Crear cuenta',
    path: '/accounts',
  },
  {
    name: 'Budget',
    Screen: BudgetForm,
    label: 'Límite mensual',
    value: '50000',
    submit: 'Crear presupuesto',
    path: '/budgets',
  },
  {
    name: 'Saving',
    Screen: SavingForm,
    label: 'Nombre',
    value: 'Meta A',
    submit: 'Crear meta',
    path: '/savings/goals',
  },
];
describe.each(cases)('$name retained-route lifecycle', ({ Screen, label, value, submit, path }) => {
  beforeEach(() => {
    mocks.params = { formSession: 'A', id: '' };
    const existingGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((url: string, ...args: unknown[]) => {
      if (url === '/categories')
        return Promise.resolve({ data: [{ id: 4, name: 'Comida', type: 'EXPENSE' }] });
      if (url === '/savings/goals')
        return Promise.resolve({ data: [{ id: 99, name: 'Anterior', targetAmount: 100 }] });
      return existingGet(url, ...args);
    });
  });
  async function fill(tree: ReturnType<typeof create>) {
    await act(async () => {
      input(tree, label).props.onChangeText(value);
      if (Screen === BudgetForm) tree.root.findByType(ModalSelector).props.onSelect(4);
      if (Screen === SavingForm) tree.root.findByType(MoneyInput).props.onChangeText('100000');
    });
  }
  it('preserves internal draft and starts clean after back/new entry', async () => {
    const tree = await render(<Screen />);
    await fill(tree);
    await reenter(tree, Screen, { formSession: 'A', id: '' });
    expect(input(tree, label).props.value).toBe(value);
    await reenter(tree, Screen, { formSession: 'B', id: '' });
    expect(input(tree, label).props.value).toBe('');
    expect(
      tree.root.findAllByType(Button).find((node) => textContent(node) === submit)?.props.loading,
    ).toBeFalsy();
  });
  it('preserves values after a rejected submission and clears on next entry', async () => {
    mocks.post.mockRejectedValue(new ApiError('Invalid', 400, null, null, null, {}));
    const tree = await render(<Screen />);
    await fill(tree);
    await act(async () => press(tree, submit));
    await settled(() => expect(mocks.post).toHaveBeenCalledWith(path, expect.any(Object)));
    expect(input(tree, label).props.value).toBe(value);
    await reenter(tree, Screen, { formSession: 'B', id: '' });
    expect(input(tree, label).props.value).toBe('');
    expect(textContent(tree.toJSON())).not.toContain('No pudimos crear');
  });
  it('resets after success and permits the next creation', async () => {
    mocks.post.mockResolvedValue({ data: { id: 20, name: value, version: 0 } });
    const tree = await render(<Screen />);
    await fill(tree);
    await act(async () => press(tree, submit));
    await settled(() => expect(mocks.feedback).toHaveBeenCalled());
    expect(input(tree, label).props.value).toBe('');
    await reenter(tree, Screen, { formSession: 'B', id: '' });
    await fill(tree);
    await act(async () => press(tree, submit));
    await settled(() => expect(mocks.post).toHaveBeenCalledTimes(2));
  });
  it('ignores late success from A after opening B', async () => {
    const request = deferred<{ data: { id: number } }>();
    mocks.post.mockReturnValue(request.promise);
    const tree = await render(<Screen />);
    await fill(tree);
    await act(async () => press(tree, submit));
    await settled(() => expect(mocks.post).toHaveBeenCalled());
    await reenter(tree, Screen, { formSession: 'B', id: '' });
    await act(async () => input(tree, label).props.onChangeText('222'));
    await act(async () => request.resolve({ data: { id: 20 } }));
    await settled(() => expect(client.isMutating()).toBe(0));
    expect(input(tree, label).props.value).toBe('222');
    expect(mocks.feedback).not.toHaveBeenCalled();
  });
});

it('edits B with only its own name, id and version after editing A on a retained route', async () => {
  const second = { ...account, id: 2, name: 'Banco B', version: 19 };
  client.setQueryData(['accounts', 'list'], [account, second]);
  mocks.get.mockImplementation(async (url: string) => ({
    data:
      url === '/accounts' ? [account, second] : url === '/dashboard/month' ? dashboard : { totalElements: 1 },
  }));
  const tree = await render(<AccountDetail />);
  await settled(() => expect(textContent(tree.toJSON())).toContain('Editar cuenta'));
  expect(input(tree, 'Nombre')).toBeUndefined();
  await act(async () => press(tree, 'Editar cuenta'));
  await act(async () => input(tree, 'Nombre').props.onChangeText('Borrador A'));
  await reenter(tree, AccountDetail, { id: '2', formSession: 'B' });
  expect(input(tree, 'Nombre')).toBeUndefined();
  await act(async () => press(tree, 'Editar cuenta'));
  expect(input(tree, 'Nombre').props.value).toBe('Banco B');
  await act(async () => press(tree, 'Guardar cambios'));
  await settled(() =>
    expect(mocks.patch).toHaveBeenCalledWith(
      '/accounts/2',
      expect.objectContaining({ name: 'Banco B', version: 19 }),
    ),
  );
});

it('loads the immutable budget category and clears edit params for a new creation', async () => {
  mocks.params = {
    id: '1',
    version: '4',
    limit: '900',
    categoryId: '7',
    categoryName: 'Comida',
    formSession: 'A',
  };
  const tree = await render(<BudgetForm />);
  expect(tree.root.findByType(SelectField).props).toMatchObject({ value: 'Comida', disabled: true });
  await act(async () => input(tree, 'Límite mensual').props.onChangeText(''));
  expect(input(tree, 'Límite mensual').props.value).toBe('');
  await reenter(tree, BudgetForm, {
    id: '2',
    version: '9',
    limit: '2500',
    categoryId: '8',
    categoryName: 'Viajes',
    formSession: 'B',
  });
  expect(tree.root.findByType(SelectField).props.value).toBe('Viajes');
  expect(input(tree, 'Límite mensual').props.value).toBe('2500');
  await act(async () => press(tree, 'Guardar cambios'));
  await settled(() =>
    expect(mocks.patch).toHaveBeenCalledWith('/budgets/2', { limitAmount: 2500, version: 9 }),
  );
  openForm('/(app)/budget-form');
  const destination = mocks.push.mock.calls.at(-1)![0];
  await reenter(tree, BudgetForm, { ...mocks.params, ...destination.params });
  expect(input(tree, 'Límite mensual').props.value).toBe('');
  expect(tree.root.findByType(SelectField).props.disabled).toBe(false);
});

it('keeps November authoritative when September and October resolve out of order, then returns to September', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 16, 12));
  const requests = new Map<number, ReturnType<typeof deferred<{ data: DashboardMonth }>>>();
  const signals = new Map<number, AbortSignal>();
  const monthData = (month: number): DashboardMonth => ({
    totalIncome: month * 100000,
    totalExpense: month * 1000,
    netCashFlow: month * 99000,
    netWorthByCurrency: { COP: month * 500000 },
    accounts: [{ ...account, name: `Cuenta mes ${month}`, balance: month * 500000 }],
    budgets: {
      items: [
        {
          id: month,
          categoryName: `Presupuesto mes ${month}`,
          year: 2026,
          month,
          status: 'OK',
          limitAmount: 100000,
          spentAmount: month * 1000,
        },
      ],
    },
    recentTransactions: [
      {
        transactionId: month,
        type: 'EXPENSE',
        description: `Movimiento mes ${month}`,
        amount: month * 1000,
        currency: 'COP',
      },
    ],
  });
  const originalGet = mocks.get.getMockImplementation()!;
  mocks.get.mockImplementation(
    (url: string, options?: { params?: { month: number }; signal?: AbortSignal }) => {
      if (url !== '/dashboard/month') return originalGet(url, options);
      const month = options!.params!.month;
      if (options?.signal) signals.set(month, options.signal);
      if (!requests.has(month)) requests.set(month, deferred());
      return requests.get(month)!.promise;
    },
  );
  try {
    const tree = await render(<HomeScreen />);
    await act(async () => press(tree, 'Mes siguiente'));
    await act(async () => press(tree, 'Mes siguiente'));
    expect(textContent(tree.toJSON()).toLowerCase()).toContain('noviembre de 2026');
    expect(signals.get(9)?.aborted).toBe(true);
    expect(signals.get(10)?.aborted).toBe(true);
    await act(async () => requests.get(11)!.resolve({ data: monthData(11) }));
    await settled(() =>
      expect(client.getQueryState(dashboardKeys.month({ year: 2026, month: 11 }))?.status).toBe('success'),
    );
    await act(async () => {
      requests.get(10)!.resolve({ data: monthData(10) });
      requests.get(9)!.resolve({ data: monthData(9) });
    });
    expect(textContent(tree.toJSON())).toContain('Cuenta mes 11');
    expect(textContent(tree.toJSON())).toContain('Presupuesto mes 11');
    expect(textContent(tree.toJSON())).toContain('Movimiento mes 11');
    expect(textContent(tree.toJSON())).not.toContain('Cuenta mes 10');
    expect(textContent(tree.toJSON())).not.toContain('Movimiento mes 9');
    const monthlySignal = tree.root
      .findAllByType(ProgressSignal)
      .find((node) => node.props.signal.kind === 'flow');
    expect(monthlySignal?.props.signal.destination.params).toEqual({ year: 2026, month: 11 });
    expect(
      tree.root.findAllByType(ProgressSignal).find((node) => node.props.signal.kind === 'budget')?.props
        .signal.destination.params,
    ).toEqual({ year: 2026, month: 11 });
    await act(async () => press(tree, 'Mes anterior'));
    await act(async () => press(tree, 'Mes anterior'));
    await settled(() =>
      expect(client.getQueryState(dashboardKeys.month({ year: 2026, month: 9 }))?.status).toBe('success'),
    );
    expect(textContent(tree.toJSON()).toLowerCase()).toContain('septiembre de 2026');
    expect(textContent(tree.toJSON())).toContain('Cuenta mes 9');
    expect(textContent(tree.toJSON())).toContain('Presupuesto mes 9');
    expect(textContent(tree.toJSON())).toContain('Movimiento mes 9');
    expect(textContent(tree.toJSON())).not.toContain('Cuenta mes 11');
    expect(
      tree.root.findAllByType(ProgressSignal).find((node) => node.props.signal.kind === 'flow')?.props.signal
        .destination.params,
    ).toEqual({ year: 2026, month: 9 });
  } finally {
    vi.useRealTimers();
  }
});

it('opens account detail read-only, edits only name and cancels without a request', async () => {
  const tree = await render(<AccountDetail />);
  await settled(() => expect(client.getQueryData(['accounts', 'list'])).toBeDefined());
  expect(input(tree, 'Nombre')).toBeUndefined();
  expect(textContent(tree.toJSON())).toContain('Tipo · Efectivo');
  expect(textContent(tree.toJSON())).not.toContain('CASH');
  await act(async () => press(tree, 'Editar cuenta'));
  expect(input(tree, 'Nombre').props.value).toBe('Principal');
  expect(input(tree, 'Tipo')).toBeUndefined();
  expect(input(tree, 'Moneda')).toBeUndefined();
  await act(async () => input(tree, 'Nombre').props.onChangeText('Draft'));
  await act(async () => press(tree, 'Cancelar'));
  expect(input(tree, 'Nombre')).toBeUndefined();
  expect(mocks.patch).not.toHaveBeenCalled();
  await act(async () => press(tree, 'Editar cuenta'));
  expect(input(tree, 'Nombre').props.value).toBe('Principal');
});

import BudgetsScreen from '@/app/(app)/budgets';
import BudgetDetail from '@/app/(app)/budget-detail';
it.each([true, false])(
  'uses a compact budget creation action only with existing content: %s',
  async (existing) => {
    mocks.get.mockResolvedValue({
      data: existing
        ? [
            {
              id: 7,
              categoryName: 'Comida',
              limitAmount: 111111,
              spentAmount: 12000,
              remainingAmount: 99111,
              percentageUsed: 10.8,
              status: 'OK',
            },
          ]
        : [],
    });
    const tree = await render(<BudgetsScreen />);
    await settled(() => expect(mocks.get).toHaveBeenCalled());
    const action = tree.root
      .findAllByType(Button)
      .find((n) => n.props.accessibilityLabel === 'Crear presupuesto');
    if (existing) expect(action?.props.children).toBe('+ Nuevo');
    else expect(textContent(tree.toJSON())).toContain('Crear presupuesto');
    expect(textContent(tree.toJSON())).toContain('Planea cuánto quieres gastar');
    await act(async () => press(tree, 'Crear presupuesto'));
    expect(mocks.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/(app)/budget-form' }));
  },
);
it('preserves budget detail amounts and edit identity through the visual summary', async () => {
  mocks.params = {
    id: '7',
    version: '3',
    limit: '111111',
    spent: '12000',
    remaining: '99111',
    percentage: '10.8',
    category: 'Comida',
    categoryId: '4',
    year: '2026',
    month: '9',
    status: 'OK',
  };
  const tree = await render(<BudgetDetail />);
  const copy = textContent(tree.toJSON());
  for (const amount of [111111, 12000, 99111])
    expect(copy).toContain(formatPrivateMoney(amount, 'COP', false));
  expect(copy).toContain('10,8% usado');
  expect(copy).toContain('En curso');
  await act(async () => press(tree, 'Editar límite'));
  expect(mocks.push).toHaveBeenCalledWith(
    expect.objectContaining({
      pathname: '/(app)/budget-form',
      params: expect.objectContaining({ id: '7', version: '3', limit: '111111', categoryId: '4' }),
    }),
  );
});

describe('Tu progreso on Home', () => {
  const useful = {
    accounts: [account],
    totalIncome: 1000,
    totalExpense: 100,
    netCashFlow: 900,
    savings: [{ id: 1, name: 'Moto', progressPercent: 81 }],
  };
  it('hides section for a new user without fetching decorative data', async () => {
    const tree = await render(<FinancialProgressSection dashboard={{}} period={period} />);
    expect(tree.toJSON()).toBeNull();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('hides amounts from visual and accessible content while keeping percentages', async () => {
    mocks.hidden = true;
    const tree = await render(<FinancialProgressSection dashboard={useful} period={period} />);
    expect(textContent(tree.toJSON())).toContain('Moto está al 81%');
    expect(JSON.stringify(tree.toJSON())).not.toContain('900');
    expect(JSON.stringify(tree.toJSON())).toContain('Importe oculto');
    expect(JSON.stringify(tree.toJSON())).toContain('81 por ciento completada');
  });
  it('shows backend amount when visible and navigates using real signal targets', async () => {
    const tree = await render(<FinancialProgressSection dashboard={useful} period={period} />);
    expect(textContent(tree.toJSON())).toContain(formatPrivateMoney(900, 'COP', false));
    const buttons = tree.root.findAll((node) => (node.type as unknown) === 'Pressable');
    await act(async () => buttons[0]!.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: '/(app)/transactions', params: period });
    await act(async () => buttons[1]!.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: '/(app)/saving-detail', params: { id: 1 } });
    expect(buttons.every((node) => node.props.accessibilityRole === 'button')).toBe(true);
  });
  it('never assigns a button role to a signal without a safe destination', async () => {
    const signal = financialProgress({ dashboard: { savings: [{ progressPercent: 25 }] }, period })[0];
    const tree = await render(<ProgressSignal signal={signal!} width={260} />);
    expect(tree.root.findAll((node) => node.props.accessibilityRole === 'button')).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('25 por ciento');
  });
  it('reacts to cached credits and invalidation without initiating requests', async () => {
    const tree = await render(<FinancialProgressSection dashboard={{}} period={period} />);
    await act(async () => {
      client.setQueryData(secondaryKeys.credits, [
        { id: 2, name: 'Casa', status: 'ACTIVE', principal: 1000, paidPrincipal: 270 },
      ]);
    });
    expect(textContent(tree.toJSON())).toContain('Has avanzado 27% en Casa');
    const button = tree.root.findAll((node) => (node.type as unknown) === 'Pressable')[0];
    await act(async () => button!.props.onPress());
    expect(mocks.push).toHaveBeenLastCalledWith({ pathname: '/(app)/credit-detail', params: { id: 2 } });
    await act(async () => {
      await client.invalidateQueries({ queryKey: secondaryKeys.credits });
    });
    expect(tree.toJSON()).toBeNull();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('opens budgets in the selected month', async () => {
    mocks.params = { year: '2026', month: '2' };
    mocks.get.mockResolvedValue({ data: [] });
    await render(<BudgetsScreen />);
    await settled(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        '/budgets',
        expect.objectContaining({ params: { year: 2026, month: 2 } }),
      ),
    );
  });
  it('opens movements in the selected month and accepts a new period on the retained screen', async () => {
    mocks.params = { year: '2026', month: '2' };
    const tree = await render(<TransactionsScreen />);
    await settled(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({ params: expect.objectContaining({ year: 2026, month: 2 }) }),
      ),
    );
    mocks.params = { year: '2026', month: '3' };
    await act(async () =>
      tree.update(
        <QueryClientProvider client={client}>
          <TransactionsScreen />
        </QueryClientProvider>,
      ),
    );
    await settled(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        '/transactions',
        expect.objectContaining({ params: expect.objectContaining({ year: 2026, month: 3 }) }),
      ),
    );
  });
});
