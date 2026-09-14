import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
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

import SavingsScreen from '@/app/(app)/savings';
import SavingForm from '@/app/(app)/saving-form';
import SavingDetail from '@/app/(app)/saving-detail';
import AppLayout from '@/app/(app)/_layout';
import { SavingGoalCard } from './saving-goal-card';
import type { SavingGoal } from '@/features/secondary/secondary-api';
import { secondaryKeys } from '@/features/secondary/use-secondary';
import { savingsEventKey } from './savings-celebrations';

let client: QueryClient;
let trees: ReturnType<typeof create>[];
let goals: SavingGoal[];
let storage: Map<string, string>;
const firstGoal = {
  id: 1,
  name: 'Viaje a Japón',
  currentAmount: 0,
  targetAmount: 1000,
  progress: 0,
  completed: false,
};

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join('');
  if (value && typeof value === 'object' && 'children' in value) return text(value.children);
  return '';
}
async function render(child: React.ReactNode) {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<QueryClientProvider client={client}>{child}</QueryClientProvider>);
  });
  trees.push(tree);
  await flush(() => expect(client.getQueryData(secondaryKeys.savings)).toBeDefined());
  return tree;
}
async function flush(check: () => void) {
  await act(async () => {
    await vi.waitFor(check);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}
function press(tree: ReturnType<typeof create>, label: string) {
  const item = tree.root
    .findAll((node) => (node.type as unknown) === 'Pressable')
    .find((node) => node.props.accessibilityLabel === label || text(node) === label);
  expect(item, label).toBeDefined();
  item!.props.onPress();
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
  goals = [];
  trees = [];
  storage = new Map();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 3 } },
  });
  mocks.read.mockImplementation(async (key: string) => storage.get(key) ?? null);
  mocks.write.mockImplementation(async (key: string, value: string) => {
    expect(key).toMatch(/^[\w.-]+$/);
    storage.set(key, value);
  });
  mocks.get.mockImplementation(async (url: string) => {
    if (url === '/savings/goals') return { data: [...goals] };
    if (url === '/me') return { data: { id: 10, name: 'Ana' } };
    if (url.endsWith('/progress'))
      return { data: goals.find((goal) => url.includes(`/goals/${goal.id}/`))?.progress ?? 0 };
    throw Error(`Unexpected GET ${url}`);
  });
  mocks.post.mockImplementation(
    async (url: string, data: { name?: string; targetAmount?: number; amount?: number }) => {
      if (url === '/savings/goals') {
        const goal = { ...firstGoal, id: goals.length + 1, name: data.name, targetAmount: data.targetAmount };
        goals = [...goals, goal];
        return { data: goal };
      }
      const goal = { ...firstGoal, currentAmount: 500, progress: 50 };
      goals = [goal];
      return { data: goal };
    },
  );
});
afterEach(async () => {
  await act(async () => trees.forEach((tree) => tree.unmount()));
  client.clear();
  vi.unstubAllGlobals();
});

describe('Savings list', () => {
  it('has a purposeful empty state with exactly one creation CTA', async () => {
    const tree = await render(<SavingsScreen />);
    expect(text(tree.toJSON())).toContain('¿Qué quieres lograr?');
    expect(text(tree.toJSON())).toContain('Convierte tus planes en metas.');
    expect(
      tree.root.findAll(
        (node) =>
          (node.type as unknown) === 'Pressable' &&
          (node.props.accessibilityLabel === 'Crear mi primera meta' ||
            node.props.accessibilityLabel === 'Nueva meta'),
      ),
    ).toHaveLength(1);
    await act(async () => press(tree, 'Crear mi primera meta'));
    expect(mocks.push).toHaveBeenCalledWith('/(app)/saving-form');
  });
  it('separates active and completed goals, with no unsupported multicurrency total', async () => {
    goals = [
      { ...firstGoal, targetAmount: 3000000, currentAmount: 1200000, progress: 40 },
      {
        ...firstGoal,
        id: 2,
        name: 'Otro objetivo',
        targetAmount: 100,
        currentAmount: 100,
        progress: 100,
        completed: true,
      },
    ];
    const tree = await render(<SavingsScreen />);
    expect(tree.root.findAllByType(SavingGoalCard)).toHaveLength(2);
    expect(text(tree.toJSON())).toContain('En progreso');
    expect(text(tree.toJSON())).toContain('Cumplidas');
    expect(text(tree.toJSON())).not.toContain('1.200.100');
    expect(text(tree.toJSON())).not.toContain('COP');
    expect(text(tree.toJSON())).not.toContain('USD');
    await act(async () => press(tree, 'Aportar a Viaje a Japón'));
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: '/(app)/saving-detail',
      params: { id: '1', contribute: '1' },
    });
  });
  it('keeps long names and percentage accessible while hiding amounts', async () => {
    mocks.hidden = true;
    goals = [
      {
        ...firstGoal,
        name: 'Un viaje inolvidable con toda mi familia y mis mejores amigos para celebrar nuestros logros',
        targetAmount: 1234567890123,
        currentAmount: 500000000000,
        progress: 40.5,
      },
    ];
    const tree = await render(<SavingsScreen />);
    expect(text(tree.toJSON())).toContain(goals[0]!.name);
    expect(text(tree.toJSON())).not.toContain('500.000.000.000');
    expect(
      tree.root
        .findAll((node) => typeof node.props.accessibilityLabel === 'string')
        .map((node) => node.props.accessibilityLabel)
        .join(' '),
    ).not.toContain('500.000.000.000');
    expect(text(tree.toJSON())).toContain('40,5%');
    const progress = tree.root.findAll(
      (node) => (node.type as unknown) === 'View' && node.props.accessibilityRole === 'progressbar',
    )[0]!;
    expect(progress.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40.5 });
  });
  it('shows the introductory context only once per user', async () => {
    const tree = await render(<SavingsScreen />);
    await flush(() => expect(mocks.read).toHaveBeenCalledWith(savingsEventKey(10, 'intro')));
    await flush(() => expect(storage.get(savingsEventKey(10, 'intro'))).toBe('seen'));
    expect(text(tree.toJSON())).toContain('no cuentas bancarias');
    const second = await render(<SavingsScreen />);
    expect(text(second.toJSON())).not.toContain('no cuentas bancarias');
  });
});

describe('Create goal', () => {
  it('validates input, formats money and submits only real contract fields once', async () => {
    const tree = await render(<SavingForm />);
    await act(async () => press(tree, 'Crear meta'));
    expect(mocks.post).not.toHaveBeenCalled();
    expect(text(tree.toJSON())).toContain('Ponle un nombre a tu meta.');
    await fill(tree, 'Nombre', ' Viaje ');
    await fill(tree, 'Objetivo', '3.000.000,25');
    expect(
      tree.root
        .findAll((node) => (node.type as unknown) === 'TextInput')
        .find((node) => node.props.accessibilityLabel === 'Objetivo')!.props.value,
    ).toBe('3.000.000,25');
    await act(async () => {
      press(tree, 'Crear meta');
      press(tree, 'Crear meta');
    });
    await flush(() => expect(mocks.post).toHaveBeenCalledOnce());
    expect(mocks.post).toHaveBeenCalledWith('/savings/goals', { name: 'Viaje', targetAmount: 3000000.25 });
    expect(text(tree.toJSON())).toContain('Tu primera meta está lista');
    expect(storage.get(savingsEventKey(10, 'first-goal'))).toBe('seen');
    await act(async () => press(tree, 'Continuar'));
    expect(mocks.back).toHaveBeenCalledOnce();
  });
});

describe('Goal detail and contributions', () => {
  it('reads the numeric progress contract and actual goal fields', async () => {
    goals = [{ ...firstGoal, currentAmount: 400, progress: 40 }];
    const tree = await render(<SavingDetail />);
    await flush(() => expect(client.getQueryData(secondaryKeys.savingProgress(1))).toBe(40));
    expect(text(tree.toJSON())).toContain('Viaje a Japón');
    expect(text(tree.toJSON())).toContain('40%');
    expect(text(tree.toJSON())).toContain('Te faltan600');
    expect(text(tree.toJSON())).not.toContain('Fecha objetivo');
    expect(text(tree.toJSON())).not.toContain('COP');
  });
  it('refreshes list and progress after success, keeps the local date and celebrates the crossing', async () => {
    goals = [{ ...firstGoal, currentAmount: 400, progress: 40 }];
    mocks.params.contribute = '1';
    client.setQueryData(['savings', 2, 'progress'], 25);
    client.setQueryData(['dashboard', 2026, 9], {});
    const tree = await render(<SavingDetail />);
    await fill(tree, 'Monto del aporte', '100');
    await act(async () => press(tree, 'Fecha del aporte'));
    await act(async () =>
      tree.root
        .findAll((node) => (node.type as unknown) === 'DateTimePicker')[0]!
        .props.onChange({ type: 'set' }, new Date(2026, 11, 31)),
    );
    await act(async () => {
      press(tree, 'Registrar aporte');
      press(tree, 'Registrar aporte');
    });
    await flush(() => expect(storage.get(savingsEventKey(10, 'milestone.50', 1))).toBe('seen'));
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith('/savings/goals/1/movements', {
      amount: 100,
      movementDate: '2026-12-31',
    });
    expect(mocks.feedback).toHaveBeenCalledWith('Aporte registrado', 'success');
    expect(text(tree.toJSON())).toContain('¡Llegaste al 50%!');
    expect(client.getQueryData(secondaryKeys.savingProgress(1))).toBe(50);
    expect(client.getQueryData<SavingGoal[]>(secondaryKeys.savings)?.[0]?.currentAmount).toBe(500);
    expect(client.getQueryState(['dashboard', 2026, 9])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['savings', 2, 'progress'])?.isInvalidated).toBe(false);
    expect(mocks.get.mock.calls.filter(([url]) => url === '/savings/goals/1/progress')).toHaveLength(2);
  });
  it('preserves an uncertain form, never retries POST, and requires progress review before another send', async () => {
    goals = [firstGoal];
    mocks.params.contribute = '1';
    mocks.post.mockRejectedValue(new Error('Network timeout'));
    const tree = await render(<SavingDetail />);
    await fill(tree, 'Monto del aporte', '100');
    await act(async () => press(tree, 'Registrar aporte'));
    await flush(() => expect(mocks.post).toHaveBeenCalledOnce());
    expect(text(tree.toJSON())).toContain('No pudimos confirmar el aporte');
    expect(
      tree.root
        .findAll((node) => (node.type as unknown) === 'TextInput')
        .find((node) => node.props.accessibilityLabel === 'Monto del aporte')!.props.value,
    ).toBe('100');
    await act(async () => press(tree, 'Registrar aporte'));
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(client.getMutationCache().getAll()[0]?.options.retry).toBe(false);
    expect(storage.has(savingsEventKey(10, 'first-contribution', 1))).toBe(false);
    await act(async () => press(tree, 'Revisar progreso'));
    await flush(() =>
      expect(mocks.get.mock.calls.filter(([url]) => url === '/savings/goals/1/progress')).toHaveLength(2),
    );
    expect(text(tree.toJSON())).toContain('Ya revisé el progreso');
  });
  it('shows a completed goal and no contribution action', async () => {
    goals = [{ ...firstGoal, currentAmount: 1200, progress: 120, completed: true }];
    const tree = await render(<SavingDetail />);
    expect(text(tree.toJSON())).toContain('¡Lo lograste!');
    expect(text(tree.toJSON())).toContain('Meta cumplida ✓');
    expect(text(tree.toJSON())).not.toContain('Aportar a esta meta');
    expect(text(tree.toJSON())).toContain('Te faltan0');
  });
});

it('keeps exactly four visible tabs and all Savings routes internal', async () => {
  client.setQueryData(secondaryKeys.savings, []);
  const tree = await render(<AppLayout />);
  const routes = tree.root.findAll((node) => (node.type as unknown) === 'TabRoute');
  expect(
    routes.filter((route) => route.props.options.href !== null).map((route) => route.props.options.title),
  ).toEqual(['Inicio', 'Movimientos', 'Cuentas', 'Más']);
  for (const name of ['savings', 'saving-detail', 'saving-form'])
    expect(routes.find((route) => route.props.name === name)!.props.options.href).toBe(null);
});
