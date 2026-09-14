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
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: React.PropsWithChildren) =>
    React.createElement('SafeAreaView', undefined, children),
}));
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: React.PropsWithChildren) =>
    React.createElement('Gradient', undefined, children),
}));
vi.mock('expo-router', () => ({
  router: { push: mocks.push, back: vi.fn() },
  useLocalSearchParams: () => ({ id: '1' }),
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write }));
vi.mock('@/auth/auth-provider', () => ({ api: { get: mocks.get, post: mocks.post, patch: mocks.patch } }));
vi.mock('@/privacy/privacy-provider', () => ({
  usePrivacy: () => ({ hidden: mocks.hidden, toggle: vi.fn() }),
}));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.feedback }) }));

import AccountsScreen from '@/app/(app)/accounts';
import AccountDetail from '@/app/(app)/account-detail';
import HomeScreen from '@/app/(app)/index';
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
      expect(mocks.push).toHaveBeenCalledWith({ pathname: '/(app)/account-detail', params: { id: '1' } });
    } else {
      await act(async () => {
        press(tree, 'Editar cuenta');
      });
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
