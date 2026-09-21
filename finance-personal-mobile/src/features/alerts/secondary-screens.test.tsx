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
  logout: vi.fn(),
  logoutAll: vi.fn(),
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
  const animation = () => ({ start: (done?: () => void) => done?.(), stop: vi.fn() });
  return {
    Alert: { alert: mocks.alert },
    Switch: host('Switch'),
    AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) },
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
  useAuth: () => ({ state: { status: 'authenticated' }, logout: mocks.logout, logoutAll: mocks.logoutAll }),
}));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.2.3' } } }));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.feedback }) }));

import AlertsScreen from '@/app/(app)/alerts';
import MoreScreen from '@/app/(app)/more';
import AppLayout from '@/app/(app)/_layout';
import { PrivacyProvider, usePrivacy } from '@/privacy/privacy-provider';
import { FirstRunGuide } from '@/ui/first-run-guide';
import { presentAlert } from './alert-presentation';
import { alertDestination } from './alert-navigation';
import type { Alert } from '@/features/secondary/secondary-api';
let client: QueryClient;
let trees: ReturnType<typeof create>[];
let alerts: Alert[];
const profile = {
  id: 88,
  name: 'Jhonatan Ramírez Con Un Nombre Muy Largo Para Comprobar El Perfil',
  email: 'un.correo.muy.largo.para.comprobar.la.pantalla@example.com',
};
function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join('');
  if (value && typeof value === 'object' && 'children' in value) return text(value.children);
  if (value && typeof value === 'object' && 'props' in value) return text(value.props);
  return '';
}
async function render(child: React.ReactNode) {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <QueryClientProvider client={client}>
        <PrivacyProvider>{child}</PrivacyProvider>
      </QueryClientProvider>,
    );
  });
  trees.push(tree);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 35));
  });
  return tree;
}
function buttons(tree: ReturnType<typeof create>, label: string) {
  return tree.root.findAll(
    (node) =>
      String(node.type) === 'Pressable' &&
      (node.props.accessibilityLabel === label || text(node.props.children) === label),
  );
}
async function press(tree: ReturnType<typeof create>, label: string, index = 0) {
  await act(async () => {
    buttons(tree, label)[index]!.props.onPress();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 35));
  });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  trees = [];
  alerts = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mocks.read.mockResolvedValue(null);
  mocks.write.mockResolvedValue(undefined);
  mocks.logout.mockResolvedValue(undefined);
  mocks.logoutAll.mockResolvedValue(undefined);
  mocks.get.mockImplementation(async (path: string) => ({
    data: path === '/me' ? profile : path === '/alerts' ? alerts : [],
  }));
  mocks.post.mockResolvedValue({ data: undefined });
});
afterEach(async () => {
  await act(async () => {
    trees.forEach((tree) => tree.unmount());
  });
  client.clear();
});
describe('Alerts real screens and hooks', () => {
  it('shows a calm empty state without an unnecessary action', async () => {
    const tree = await render(<AlertsScreen />);
    expect(text(tree.toJSON())).toContain('Todo en calma');
    expect(buttons(tree, 'Marcar como vista')).toHaveLength(0);
  });
  it('renders ALL_GOOD positively but suppresses it alongside real alerts', async () => {
    alerts = [{ code: 'ALL_GOOD' }];
    const tree = await render(<AlertsScreen />);
    expect(text(tree.toJSON())).toContain('Todo en orden');
    await act(async () => {
      client.setQueryData(
        ['alerts'],
        [...alerts, { code: 'BUDGET_WARNING', data: { budgetId: 2, categoryName: 'Comida' } }],
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(text(tree.toJSON())).not.toContain('Todo en orden');
    expect(text(tree.toJSON())).toContain('Presupuesto cerca del límite');
  });
  it('renders all human groups and uniquely identifies same-code credits', async () => {
    alerts = [
      'CREDIT_BEHIND',
      'HIGH_INTEREST',
      'OPPORTUNITY_PREPAY',
      'BUDGET_WARNING',
      'BUDGET_EXCEEDED',
      'SPEND_SPIKE',
    ].map((code, i) => ({
      code,
      data: { creditId: i + 1, budgetId: i + 1, categoryName: 'Comida', year: 2026, month: 9 },
    }));
    alerts.push({ code: 'CREDIT_BEHIND', data: { creditId: 99 } });
    const tree = await render(<AlertsScreen />);
    const output = text(tree.toJSON());
    for (const alert of alerts) {
      expect(output).toContain(presentAlert(alert).title);
      expect(output).not.toContain(alert.code);
    }
    for (const level of ['Importante', 'Atención', 'Información']) expect(output).toContain(level);
    expect(buttons(tree, 'Marcar como vista')).toHaveLength(7);
  });
  it('sends relatedId, prevents double submit, refetches and shows success', async () => {
    alerts = [{ code: 'CREDIT_BEHIND', data: { creditId: 9 } }];
    let finish!: () => void;
    mocks.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => {
            alerts = [{ code: 'ALL_GOOD' }];
            resolve({ data: undefined });
          };
        }),
    );
    const tree = await render(<AlertsScreen />);
    await act(async () => {
      const click = buttons(tree, 'Marcar como vista')[0]!.props.onPress;
      click();
      click();
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/alerts/CREDIT_BEHIND/seen', { relatedId: 9 });
    expect(client.getMutationCache().getAll()[0]?.options.retry).toBe(false);
    await act(async () => {
      finish();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(mocks.feedback).toHaveBeenCalledWith('Alerta marcada como vista.', 'success');
    expect(text(tree.toJSON())).toContain('Todo en orden');
  });
  it('keeps failed seen visible and never retries automatically', async () => {
    alerts = [{ code: 'SPEND_SPIKE' }];
    mocks.post.mockRejectedValue(Error('offline'));
    const tree = await render(<AlertsScreen />);
    await press(tree, 'Marcar como vista');
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/alerts/SPEND_SPIKE/seen', {});
    expect(text(tree.toJSON())).toContain('Gasto inusual');
    expect(mocks.feedback).toHaveBeenCalledWith(expect.stringContaining('No pudimos confirmar'), 'error');
  });
  it('navigates only the explicitly related credit without marking it seen', async () => {
    alerts = [{ code: 'HIGH_INTEREST', data: { creditId: 17 } }];
    const tree = await render(<AlertsScreen />);
    await press(tree, 'Ver crédito');
    expect(mocks.push).toHaveBeenCalledWith({ pathname: '/(app)/credit-detail', params: { id: '17' } });
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('fetches the exact budget period before opening detail with its real version', async () => {
    alerts = [{ code: 'BUDGET_EXCEEDED', data: { budgetId: 4, year: 2026, month: 8 } }];
    mocks.get.mockImplementation(async (path: string) => ({
      data:
        path === '/alerts'
          ? alerts
          : [
              {
                id: 4,
                version: 7,
                limitAmount: 100,
                spentAmount: 150,
                remainingAmount: -50,
                percentageUsed: 150,
                status: 'EXCEEDED',
                categoryName: 'Comida',
              },
            ],
    }));
    const tree = await render(<AlertsScreen />);
    await press(tree, 'Ver presupuesto');
    expect(mocks.get).toHaveBeenCalledWith('/budgets', { params: { year: 2026, month: 8 } });
    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(app)/budget-detail',
        params: expect.objectContaining({ id: '4', version: '7', remaining: '-50' }),
      }),
    );
  });
  it('does not open missing budgets or synthesize zero values', async () => {
    expect(await alertDestination({ kind: 'budget', id: 4, year: 2026, month: 8 }, client)).toBeUndefined();
  });
  it('keeps sensitive backend prose out of rendered text and accessibility in privacy mode', async () => {
    mocks.read.mockResolvedValue('true');
    alerts = [
      {
        code: 'HIGH_INTEREST',
        message: 'Pagaste $123456',
        data: { creditId: 4, realInterest: 123456, annualEffectiveRatePercent: 18 },
      },
    ];
    const tree = await render(<AlertsScreen />);
    expect(text(tree.toJSON())).not.toContain('123456');
    expect(
      tree.root
        .findAll((node) => typeof node.props.accessibilityLabel === 'string')
        .map((node) => node.props.accessibilityLabel)
        .join(' '),
    ).not.toContain('123456');
    expect(text(tree.toJSON())).toContain('Tasa EA 18%');
    expect(buttons(tree, 'Ver crédito')).toHaveLength(1);
  });
});
describe('More, preferences and session UI', () => {
  it('loads current profile, initials, long identity and configured version with no alerts request', async () => {
    const tree = await render(<MoreScreen />);
    const output = text(tree.toJSON());
    expect(output).toContain(profile.name);
    expect(output).toContain(profile.email);
    expect(output).toContain('JP');
    expect(output).toContain('Versión 1.2.3');
    expect(mocks.get.mock.calls.map(([path]) => path)).toEqual(['/me']);
    expect(output).not.toContain('Apariencia');
    expect(output).not.toContain('Google');
  });
  it.each([
    ['Categorías', 'categories'],
    ['Presupuestos', 'budgets'],
    ['Ahorros', 'savings'],
    ['Créditos', 'credits'],
    ['Alertas', 'alerts'],
  ])('opens %s', async (label, route) => {
    const tree = await render(<MoreScreen />);
    await press(tree, label);
    expect(mocks.push).toHaveBeenCalledWith(`/(app)/${route}`);
  });
  it('uses the existing privacy provider and persists the same preference', async () => {
    function Probe() {
      const { hidden } = usePrivacy();
      return <span>{hidden ? 'hidden' : 'visible'}</span>;
    }
    const tree = await render(
      <>
        <MoreScreen />
        <Probe />
      </>,
    );
    const toggle = tree.root.find((node) => String(node.type) === 'Switch');
    await act(async () => {
      await toggle.props.onValueChange(true);
    });
    expect(text(tree.toJSON())).toContain('hidden');
    expect(tree.root.find((node) => String(node.type) === 'Switch').props.value).toBe(true);
    expect(mocks.write).toHaveBeenCalledWith('finance-personal.privacy-hidden.v1', 'true');
  });
  it('replays the guide without modifying onboarding or setup storage', async () => {
    const tree = await render(<MoreScreen />);
    mocks.write.mockClear();
    await press(tree, 'Ver guía de inicio');
    expect(text(tree.toJSON())).toContain('Tu dinero, en un solo lugar');
    await press(tree, 'Continuar');
    await press(tree, 'Continuar');
    await press(tree, 'Listo');
    expect(text(tree.toJSON())).not.toContain('Construye mejores hábitos');
    expect(mocks.write).not.toHaveBeenCalled();
    await press(tree, 'Ver guía de inicio');
    expect(text(tree.toJSON())).toContain('Tu dinero, en un solo lugar');
  });
  it('preserves automatic first-run completion behavior', async () => {
    const tree = await render(<FirstRunGuide userId={88} />);
    await press(tree, 'Omitir introducción');
    expect(mocks.write).toHaveBeenCalledWith(expect.stringContaining('88'), 'done');
  });
  it.each([
    ['Cerrar sesión', 'logout'],
    ['Cerrar sesión en todos los dispositivos', 'logoutAll'],
  ] as const)('confirms %s and supports cancellation', async (label, method) => {
    const tree = await render(<MoreScreen />);
    await press(tree, label);
    expect(mocks[method]).not.toHaveBeenCalled();
    await act(async () => {
      mocks.alert.mock.calls[0]![2][0].onPress();
    });
    await press(tree, label);
    await act(async () => {
      mocks.alert.mock.calls[1]![2][1].onPress();
    });
    expect(mocks[method]).toHaveBeenCalledTimes(1);
  });
  it('communicates remote logout-all failure without claiming every device was revoked', async () => {
    mocks.logoutAll.mockRejectedValue(Error('offline'));
    const tree = await render(<MoreScreen />);
    await press(tree, 'Cerrar sesión en todos los dispositivos');
    await act(async () => {
      mocks.alert.mock.calls[0]![2][1].onPress();
    });
    expect(mocks.feedback).toHaveBeenCalledWith(expect.stringContaining('no pudimos confirmar'), 'warning');
  });
  it('retains exactly four tabs with alerts and all detail routes hidden', async () => {
    const tree = await render(<AppLayout />);
    const tabs = tree.root.findAll((node) => String(node.type) === 'TabRoute');
    expect(tabs.filter((node) => node.props.options.href !== null).map((node) => node.props.name)).toEqual([
      'index',
      'transactions',
      'accounts',
      'more',
    ]);
  });
});
