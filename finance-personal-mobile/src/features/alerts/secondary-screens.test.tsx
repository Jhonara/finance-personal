vi.mock('@/ui/navigation-dock', () => ({ NavigationDock: () => null }));
vi.mock('@/features/onboarding/interactive-tour', () => ({
  InteractiveTourProvider: ({ children }: React.PropsWithChildren) => children,
}));
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
  params: { id: '1', contribute: undefined as string | undefined } as {
    id: string;
    contribute?: string;
    topic?: string;
  },
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
    BackHandler: { addEventListener: () => ({ remove() {} }) },
    Alert: { alert: mocks.alert },
    Switch: host('Switch'),
    AccessibilityInfo: { isReduceMotionEnabled: async () => true, addEventListener: () => ({ remove() {} }) },
    ActivityIndicator: host('ActivityIndicator'),
    Image: host('Image'),
    KeyboardAvoidingView: host('KeyboardAvoidingView'),
    Modal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? children : null,
    Pressable: host('Pressable'),
    ScrollView: host('ScrollView'),
    Text: host('Text'),
    TextInput: host('TextInput'),
    View: host('View'),
    RefreshControl: host('RefreshControl'),
    useWindowDimensions: () => ({ width: 360, height: 640, fontScale: 1, scale: 1 }),
    StyleSheet: { create: (styles: object) => styles },
    Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
    Animated: {
      Text: host('Text'),
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
vi.mock('@/ui/journey-scene', () => ({
  JourneyScene: ({ children }: React.PropsWithChildren) => React.createElement('View', undefined, children),
}));

import AlertsScreen from '@/app/(app)/alerts';
import MoreScreen from '@/app/(app)/more';
import GuideScreen from '@/app/(app)/guide';
import PlanScreen from '@/app/(app)/plan';
import { QuickActionProvider } from '@/features/quick-actions/quick-action-provider';
import { guideKey } from '@/features/onboarding/ecosystem-guide';
import { currentUserKeys } from '@/features/profile/profile-keys';
import AppLayout from '@/app/(app)/_layout';
import { HomeModules } from '@/features/dashboard/home-modules';
import { ModalSelector } from '@/ui/modal-selector';
import { homePriorityKey } from '@/features/dashboard/home-priority';
import { homePriorityQueryKey } from '@/features/dashboard/use-home-priority';
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
  mocks.params = { id: '1' };
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
  it('snoozes and resumes without claiming everything is resolved', async () => {
    alerts = [{ id: 8, revision: 1, state: 'ACTIVE', code: 'CREDIT_BEHIND', data: { creditId: 9 } }];
    mocks.post.mockImplementation(async (_path: string, data: { action: string }) => {
      alerts = alerts.map((alert) => ({ ...alert, state: data.action === 'SNOOZE' ? 'SNOOZED' : 'ACTIVE' }));
      return { data: alerts[0] };
    });
    const tree = await render(<AlertsScreen />);
    await press(tree, 'Posponer a mañana');
    expect(text(tree.toJSON())).toContain('Tus avisos están pospuestos');
    expect(text(tree.toJSON())).not.toContain('Sin avisos pendientes');
    await press(tree, 'Pospuestas · 1');
    await press(tree, 'Volver a pendientes');
    expect(mocks.post).toHaveBeenLastCalledWith('/alerts/8/state', { revision: 1, action: 'RESUME' });
    expect(text(tree.toJSON())).toContain('Pago de crédito pendiente');
    expect(text(tree.toJSON())).not.toContain('Tus avisos están pospuestos');
  });
  it('loads history on demand and distinguishes expired periods from resolved conditions', async () => {
    mocks.get.mockImplementation(async (path: string) => ({
      data:
        path === '/alerts/history'
          ? [
              { id: 1, revision: 1, state: 'ARCHIVED', code: 'SPEND_SPIKE' },
              { id: 2, revision: 1, state: 'RESOLVED', code: 'CREDIT_BEHIND' },
            ]
          : [],
    }));
    const tree = await render(<AlertsScreen />);
    expect(mocks.get).not.toHaveBeenCalledWith('/alerts/history');
    await press(tree, 'Historial');
    expect(mocks.get).toHaveBeenCalledWith('/alerts/history');
    expect(text(tree.toJSON())).toContain('Período finalizado');
    expect(text(tree.toJSON())).toContain('Resuelta');
    expect(buttons(tree, 'Marcar como vista')).toHaveLength(0);
    expect(buttons(tree, 'Posponer a mañana')).toHaveLength(0);
    await press(tree, 'Detalle del aviso');
    expect(text(tree.toJSON())).toContain('no significa que el problema se haya solucionado');
  });
  it('opens the spending report with its exact period and currency', async () => {
    alerts = [{ code: 'SPEND_SPIKE', data: { year: 2026, month: 10, currency: 'USD' } }];
    const tree = await render(<AlertsScreen />);
    await press(tree, 'Ver gastos del mes');
    expect(mocks.push).toHaveBeenCalledWith({
      pathname: '/(app)/reports',
      params: { year: '2026', month: '10', currency: 'USD' },
    });
  });
  it('shows a retry state when history cannot load', async () => {
    mocks.get.mockImplementation(async (path: string) => {
      if (path === '/alerts/history') throw Error('offline');
      return { data: [] };
    });
    const tree = await render(<AlertsScreen />);
    await press(tree, 'Historial');
    expect(text(tree.toJSON())).not.toContain('Aún no hay historial');
    expect(buttons(tree, 'Reintentar')).toHaveLength(1);
  });
  it('shows a calm empty state without an unnecessary action', async () => {
    const tree = await render(<AlertsScreen />);
    expect(text(tree.toJSON())).toContain('Sin avisos pendientes');
    expect(buttons(tree, 'Marcar como vista')).toHaveLength(0);
  });
  it('renders ALL_GOOD positively but suppresses it alongside real alerts', async () => {
    alerts = [{ code: 'ALL_GOOD' }];
    const tree = await render(<AlertsScreen />);
    expect(text(tree.toJSON())).toContain('Sin avisos pendientes');
    await act(async () => {
      client.setQueryData(
        ['alerts'],
        [...alerts, { code: 'BUDGET_WARNING', data: { budgetId: 2, categoryName: 'Comida' } }],
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(text(tree.toJSON())).not.toContain('Sin avisos pendientes');
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
      id: i + 1,
      revision: 0,
      state: 'ACTIVE',
      code,
      data: { creditId: i + 1, budgetId: i + 1, categoryName: 'Comida', year: 2026, month: 9 },
    }));
    alerts.push({ id: 99, revision: 0, state: 'ACTIVE', code: 'CREDIT_BEHIND', data: { creditId: 99 } });
    const tree = await render(<AlertsScreen />);
    const output = text(tree.toJSON());
    for (const alert of alerts) {
      expect(output).toContain(presentAlert(alert).title);
      expect(output).not.toContain(alert.code);
    }
    for (const level of ['Importante', 'Atención', 'Información']) expect(output).toContain(level);
    expect(buttons(tree, 'Marcar como vista')).toHaveLength(7);
  });
  it('marks read once without hiding a pending condition', async () => {
    alerts = [{ id: 3, revision: 0, state: 'ACTIVE', code: 'CREDIT_BEHIND', data: { creditId: 9 } }];
    let finish!: () => void;
    mocks.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => {
            alerts = alerts.map((alert) => ({ ...alert, read: true }));
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
    expect(mocks.post).toHaveBeenCalledWith('/alerts/3/state', { revision: 0, action: 'READ' });
    expect(client.getMutationCache().getAll()[0]?.options.retry).toBe(false);
    await act(async () => {
      finish();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(mocks.feedback).toHaveBeenCalledWith(expect.stringContaining('Sigue pendiente'), 'success');
    expect(text(tree.toJSON())).toContain('Vista · pendiente');
    expect(text(tree.toJSON())).not.toContain('Sin avisos pendientes');
    expect(buttons(tree, 'Marcar como vista')).toHaveLength(0);
  });
  it('keeps failed seen visible and never retries automatically', async () => {
    alerts = [{ id: 5, revision: 2, state: 'ACTIVE', code: 'SPEND_SPIKE' }];
    mocks.post.mockRejectedValue(Error('offline'));
    const tree = await render(<AlertsScreen />);
    await press(tree, 'Marcar como vista');
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/alerts/5/state', { revision: 2, action: 'READ' });
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
    await press(tree, 'Por qué aparece');
    expect(text(tree.toJSON())).toContain('Tasa EA 18%');
    expect(buttons(tree, 'Ver crédito')).toHaveLength(1);
  });
});
describe('More, preferences and session UI', () => {
  it('changes the shared Home preference from Profile and keeps it on a failed save', async () => {
    const tree = await render(<MoreScreen />);
    await press(tree, 'Personalizar Inicio');
    let picker = tree.root.findAllByType(ModalSelector).find((node) => node.props.visible)!;
    await act(async () => {
      picker.props.onSelect(3);
      picker.props.onClose();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 35));
    });
    expect(mocks.write).toHaveBeenCalledWith(homePriorityKey(profile.id), 'savings');
    expect(client.getQueryData(homePriorityQueryKey(profile.id))).toBe('savings');
    expect(text(tree.toJSON())).toContain('Ahorrar para mis metas');
    mocks.write.mockRejectedValueOnce(new Error('Storage unavailable'));
    await press(tree, 'Personalizar Inicio');
    picker = tree.root.findAllByType(ModalSelector).find((node) => node.props.visible)!;
    await act(async () => {
      picker.props.onSelect(2);
      picker.props.onClose();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 35));
    });
    expect(client.getQueryData(homePriorityQueryKey(profile.id))).toBe('savings');
    expect(mocks.feedback).toHaveBeenLastCalledWith(
      expect.stringContaining('Se mantiene tu Inicio anterior'),
      'error',
    );
  });

  it('loads current profile, initials, long identity and configured version with no alerts request', async () => {
    const tree = await render(<MoreScreen />);
    const output = text(tree.toJSON());
    expect(output).toContain(profile.name);
    expect(output).toContain(profile.email);
    expect(output).toContain('JP');
    expect(output).toContain('Versión 1.2.3');
    expect(mocks.get.mock.calls.map(([path]) => path)).toEqual(['/me']);
    expect(output).toContain('Apariencia');
    expect(output).not.toContain('Google');
  });
  it('keeps secondary organization in Más', async () => {
    const tree = await render(<MoreScreen />);
    await press(tree, 'Categorías');
    expect(mocks.push).toHaveBeenCalledWith('/(app)/categories');
    for (const label of ['Presupuestos', 'Ahorros', 'Créditos', 'Alertas']) {
      expect(buttons(tree, label)).toHaveLength(0);
    }
  });
  it.each([
    ['presupuestos', 'budgets'],
    ['ahorros', 'savings'],
  ])('opens %s from Tu plan on Home', async (label, route) => {
    const tree = await render(<HomeModules data={{}} period={{ year: 2026, month: 10 }} />);
    await press(tree, `Ver ${label}`);
    if (route === 'budgets') {
      expect(mocks.push).toHaveBeenCalledWith({
        pathname: '/(app)/budgets',
        params: { year: 2026, month: 10 },
      });
    } else {
      expect(mocks.push).toHaveBeenCalledWith(`/(app)/${route}`);
    }
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
    const toggle = tree.root.find(
      (node) => String(node.type) === 'Switch' && node.props.accessibilityLabel === 'Ocultar importes',
    );
    await act(async () => {
      await toggle.props.onValueChange(true);
    });
    expect(text(tree.toJSON())).toContain('hidden');
    expect(
      tree.root.find(
        (node) => String(node.type) === 'Switch' && node.props.accessibilityLabel === 'Ocultar importes',
      ).props.value,
    ).toBe(true);
    expect(mocks.write).toHaveBeenCalledWith('finance-personal.privacy-hidden.v1', 'true');
  });
  it('opens the full guide without modifying onboarding or setup storage', async () => {
    const tree = await render(<MoreScreen />);
    mocks.write.mockClear();
    await press(tree, 'Ver guía de inicio');
    expect(mocks.push).toHaveBeenCalledWith('/(app)/guide');
    expect(mocks.write).not.toHaveBeenCalled();
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
  it('retains five brand tabs with alerts and all detail routes hidden', async () => {
    const tree = await render(<AppLayout />);
    const tabs = tree.root.findAll((node) => String(node.type) === 'TabRoute');
    expect(tabs.filter((node) => node.props.options.href !== null).map((node) => node.props.name)).toEqual([
      'index',
      'transactions',
      'action',
      'accounts',
      'plan',
    ]);
  });
});

describe('Ecosystem guide and plan navigation', () => {
  it('opens real modules without marking financial tasks complete, then saves reading progress', async () => {
    const tree = await render(
      <QuickActionProvider>
        <GuideScreen />
      </QuickActionProvider>,
    );
    await vi.waitFor(() => expect(text(tree.toJSON())).toContain('0 de 12 temas recorridos'));
    await press(tree, 'Abrir Cuentas →');
    expect(mocks.push).toHaveBeenCalledWith('/(app)/accounts');
    expect(mocks.write).not.toHaveBeenCalled();
    await press(tree, 'Entendido, siguiente tema');
    expect(mocks.write).toHaveBeenCalledWith(
      guideKey(88),
      JSON.stringify({ reviewed: ['accounts'], lastTopic: 'movements' }),
    );
    expect(text(tree.toJSON())).toContain('TEMA 2 DE 12');
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('resumes the saved topic and does not leak progress to another signed-in user', async () => {
    mocks.read.mockImplementation(async (key: string) =>
      key === guideKey(88)
        ? JSON.stringify({ reviewed: ['accounts', 'movements'], lastTopic: 'credits' })
        : null,
    );
    const tree = await render(
      <QuickActionProvider>
        <GuideScreen />
      </QuickActionProvider>,
    );
    await vi.waitFor(() => expect(text(tree.toJSON())).toContain('TEMA 7 DE 12'));
    expect(text(tree.toJSON())).toContain('2 de 12 temas recorridos');
    await act(async () => {
      client.setQueryData(currentUserKeys.current(), { ...profile, id: 99 });
    });
    await vi.waitFor(() => expect(text(tree.toJSON())).toContain('0 de 12 temas recorridos'));
    expect(text(tree.toJSON())).toContain('TEMA 1 DE 12');
  });

  it('keeps the topic on a storage failure and prevents duplicate next actions', async () => {
    mocks.write.mockRejectedValueOnce(Error('storage unavailable'));
    const tree = await render(
      <QuickActionProvider>
        <GuideScreen />
      </QuickActionProvider>,
    );
    await vi.waitFor(() => expect(buttons(tree, 'Entendido, siguiente tema')).toHaveLength(1));
    await press(tree, 'Entendido, siguiente tema');
    expect(text(tree.toJSON())).toContain('No pudimos guardar tu recorrido');
    expect(text(tree.toJSON())).toContain('0 de 12 temas recorridos');
    let finish!: () => void;
    mocks.write.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await act(async () => {
      const next = buttons(tree, 'Entendido, siguiente tema')[0]!.props.onPress;
      next();
      next();
    });
    expect(mocks.write).toHaveBeenCalledTimes(2);
    await act(async () => {
      finish();
    });
    expect(text(tree.toJSON())).toContain('1 de 12 temas recorridos');
  });

  it('groups tools in a compact menu and opens each module directly', async () => {
    const originalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (path: string) =>
      path === '/dashboard/month'
        ? { data: { credits: [{ status: 'ACTIVE' }, { status: 'LATE' }], alerts: [{ code: 'ALL_GOOD' }] } }
        : originalGet(path),
    );
    const tree = await render(<PlanScreen />);
    expect(text(tree.toJSON())).toContain('Menú');
    expect(text(tree.toJSON())).toContain('Sin avisos');
    await press(tree, 'Créditos');
    expect(mocks.push).toHaveBeenLastCalledWith('/(app)/credits');
    await press(tree, 'Metas de ahorro');
    expect(mocks.push).toHaveBeenLastCalledWith('/(app)/savings');
    await press(tree, 'Categorías');
    expect(mocks.push).toHaveBeenLastCalledWith('/(app)/categories');
    await press(tree, 'Ayuda');
    expect(mocks.push).toHaveBeenLastCalledWith('/(app)/guide');
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
