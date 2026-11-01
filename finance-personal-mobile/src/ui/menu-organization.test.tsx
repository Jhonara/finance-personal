import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  alert: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  togglePrivacy: vi.fn(),
  setMode: vi.fn(),
  show: vi.fn(),
  startTour: vi.fn(),
  setWidget: vi.fn(),
  width: 393,
  fontScale: 1,
  palette: {} as Record<string, string>,
}));
vi.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Switch: 'Switch',
  StyleSheet: { create: (styles: object) => styles },
  Platform: { OS: 'android', select: (values: Record<string, unknown>) => values.android ?? values.default },
  useWindowDimensions: () => ({ width: mocks.width, height: 800, fontScale: mocks.fontScale }),
}));
vi.mock('expo-router', () => ({ router: { push: mocks.push, back: mocks.back } }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
vi.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({ palette: mocks.palette, mode: 'system', setMode: mocks.setMode }),
}));
vi.mock('@/features/secondary/use-secondary', () => ({
  useAlerts: () => ({ data: [], isPending: false, isError: false }),
}));
vi.mock('@/features/dashboard/dashboard-period', () => ({
  currentDashboardPeriod: () => ({ year: 2026, month: 10 }),
}));
vi.mock('@/auth/auth-provider', () => ({
  useAuth: () => ({ logout: mocks.logout, logoutAll: mocks.logoutAll }),
}));
vi.mock('@/features/profile/use-current-user', () => ({
  useCurrentUser: () => ({
    data: { id: 7, name: 'Juan', email: 'qa@example.test' },
    isPending: false,
    isError: false,
  }),
}));
vi.mock('@/privacy/privacy-provider', () => ({
  usePrivacy: () => ({ hidden: false, toggle: mocks.togglePrivacy }),
}));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.show }) }));
vi.mock('@/feedback/app-alert', () => ({ AppAlert: { alert: mocks.alert } }));
vi.mock('@/features/onboarding/tour-context', () => ({ useTour: () => ({ start: mocks.startTour }) }));
vi.mock('@/features/widget/home-widget-bridge', () => ({
  homeWidgetBridge: { available: true, getVisible: () => false, setVisible: mocks.setWidget },
}));
vi.mock('@/features/capture/capture-diagnostics', () => ({ captureQaEnabled: true }));
vi.mock('@/features/dashboard/home-priority-settings', () => ({
  HomePrioritySettings: 'HomePrioritySettings',
}));
vi.mock('@/features/dashboard/home-upcoming', () => ({ HomeUpcomingSettings: 'HomeUpcomingSettings' }));
vi.mock('@/features/capture/detected-notice-settings', () => ({
  DetectedNoticeSettings: 'DetectedNoticeSettings',
}));
vi.mock('@/ui/primitives', () => ({ Screen: 'Screen', Card: 'Card' }));
vi.mock('@/ui/headers', () => ({ ScreenHeader: 'ScreenHeader' }));
vi.mock('@/ui/brand-surface', () => ({ BrandSurface: 'BrandSurface' }));
vi.mock('@/ui/brand-identity', () => ({ BrandMark: 'BrandMark' }));
vi.mock('@/ui/tour-target', () => ({ TourTarget: 'TourTarget' }));
vi.mock('@/ui/states', () => ({ ErrorState: 'ErrorState', SkeletonRow: 'SkeletonRow' }));
vi.mock('@/ui/motion', () => ({ MotionPressable: 'MotionPressable', MotionEntry: 'MotionEntry' }));

import { lightPalette, setThemeColors } from '@/theme';
import PlanScreen from '@/app/(app)/plan';
import MoreScreen from '@/app/(app)/more';

let tree: ReactTestRenderer | undefined;
async function render(screen: React.ReactElement) {
  await act(async () => {
    tree = create(screen);
  });
}
function hosts(name: string) {
  return tree!.root.findAll((node) => (node.type as unknown) === name);
}
function button(label: string) {
  return hosts('MotionPressable').find((node) => node.props.accessibilityLabel === label)!;
}
const textContent = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (value && typeof value === 'object' && 'children' in value) return textContent(value.children);
  return '';
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.width = 393;
  mocks.fontScale = 1;
  mocks.palette = { ...lightPalette };
  mocks.setMode.mockResolvedValue(undefined);
  mocks.togglePrivacy.mockResolvedValue(undefined);
  mocks.logout.mockResolvedValue(undefined);
  mocks.logoutAll.mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  setThemeColors(lightPalette);
});

describe('tool and preference organization', () => {
  it('promotes reports and budgets while preserving all menu destinations and the credit tour target', async () => {
    await render(<PlanScreen />);
    const labels = hosts('MotionPressable').map((node) => node.props.accessibilityLabel);
    expect(labels.slice(0, 2)).toEqual(['Reportes', 'Presupuestos']);
    const routes = [
      ['Reportes', { pathname: '/(app)/reports', params: { year: 2026, month: 10 } }],
      ['Presupuestos', { pathname: '/(app)/budgets', params: { year: 2026, month: 10 } }],
      ['Ingresos y gastos fijos', '/(app)/recurrences'],
      ['Metas de ahorro', '/(app)/savings'],
      ['Créditos', '/(app)/credits'],
      ['Alertas', '/(app)/alerts'],
      ['Categorías', '/(app)/categories'],
      ['Perfil y ajustes', '/(app)/more'],
      ['Ayuda', '/(app)/guide'],
    ] as const;
    for (const [label, destination] of routes) {
      await act(async () => button(label).props.onPress());
      expect(mocks.push).toHaveBeenLastCalledWith(destination);
    }
    expect(hosts('TourTarget').some((node) => node.props.id === 'plan-credits')).toBe(true);
    expect(hosts('Text').map((node) => textContent(node.children))).toContain('Planifica');
  });

  it.each([false, true])('uses the current palette for primary cards (dark=%s)', async (dark) => {
    if (dark)
      mocks.palette = { ...lightPalette, surface: '#11272D', textPrimary: '#EAF8F5', border: '#31545A' };
    setThemeColors(mocks.palette as typeof lightPalette);
    await render(<PlanScreen />);
    for (const label of ['Reportes', 'Presupuestos']) {
      const styles = button(label).props.style as Array<Record<string, unknown>>;
      expect(styles.at(-1)).toMatchObject({
        backgroundColor: mocks.palette.surface,
        borderColor: mocks.palette.border,
      });
    }
  });

  it('stacks the main actions for narrow screens or large system text', async () => {
    mocks.width = 360;
    mocks.fontScale = 1.5;
    await render(<PlanScreen />);
    const row = button('Reportes').parent!;
    expect(row.props.style.at(-1)).toMatchObject({ flexDirection: 'column' });
    expect(button('Presupuestos')).toBeDefined();
  });

  it('puts theme and privacy controls first and keeps advanced settings behind explicit expandable sections', async () => {
    await render(<MoreScreen />);
    const labels = tree!.root
      .findAll((node) => ['MotionPressable', 'Switch'].includes(node.type as string))
      .map((node) => node.props.accessibilityLabel);
    expect(labels.slice(0, 4)).toEqual(['Tema sistema', 'Tema claro', 'Tema oscuro', 'Ocultar importes']);
    expect(hosts('HomePrioritySettings')).toHaveLength(0);
    expect(hosts('DetectedNoticeSettings')).toHaveLength(0);
    await act(async () => button('Tema claro').props.onPress());
    expect(mocks.setMode).toHaveBeenCalledWith('light');
    await act(async () =>
      hosts('Switch')
        .find((node) => node.props.accessibilityLabel === 'Ocultar importes')!
        .props.onValueChange(),
    );
    expect(mocks.togglePrivacy).toHaveBeenCalledOnce();
    await act(async () => button('Opciones de Inicio').props.onPress());
    expect(hosts('HomePrioritySettings')[0]!.props.userId).toBe(7);
    expect(hosts('HomeUpcomingSettings')[0]!.props.userId).toBe(7);
    await act(async () => button('Avisos y captura').props.onPress());
    expect(hosts('DetectedNoticeSettings')).toHaveLength(1);
    for (const [label, destination] of [
      ['Lectura de avisos bancarios', '/(app)/capture-notifications'],
      ['Diagnóstico de captura', '/(app)/capture-diagnostics'],
      ['Categorías', '/(app)/categories'],
      ['Ver guía de inicio', '/(app)/guide'],
    ]) {
      await act(async () => button(label!).props.onPress());
      expect(mocks.push).toHaveBeenLastCalledWith(destination);
    }
    await act(async () => button('Recorrido interactivo').props.onPress());
    expect(mocks.startTour).toHaveBeenCalledOnce();
    expect(hosts('TourTarget').some((node) => node.props.id === 'profile-guide')).toBe(true);
  });

  it('retains widget privacy and confirmed session actions', async () => {
    await render(<MoreScreen />);
    await act(async () =>
      hosts('Switch')
        .find((node) => node.props.accessibilityLabel === 'Mostrar montos en el widget')!
        .props.onValueChange(true),
    );
    expect(mocks.setWidget).toHaveBeenCalledWith(true);
    await act(async () => button('Cerrar sesión').props.onPress());
    expect(mocks.logout).not.toHaveBeenCalled();
    await act(async () => mocks.alert.mock.calls.at(-1)![2][0].onPress());
    await act(async () => button('Cerrar sesión en todos los dispositivos').props.onPress());
    await act(async () => mocks.alert.mock.calls.at(-1)![2][1].onPress());
    expect(mocks.logoutAll).toHaveBeenCalledOnce();
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
