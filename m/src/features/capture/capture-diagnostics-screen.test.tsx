import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: { status: 'authenticated' } as { status: string },
  owner: 7,
  currentUser: vi.fn(),
  diagnostics: vi.fn(),
  createDraft: vi.fn(),
  alert: vi.fn(),
}));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View' }));
vi.mock('expo-router', () => ({ router: { back: vi.fn(), push: vi.fn(), replace: vi.fn() } }));
vi.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ state: mocks.state }) }));
vi.mock('@/features/profile/use-current-user', () => ({
  useCurrentUser: () => ({ data: { id: mocks.owner } }),
}));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: mocks.currentUser }));
vi.mock('@/features/forms/form-session', () => ({ openForm: vi.fn() }));
vi.mock('@/features/capture/capture-diagnostics', () => ({
  captureQaEnabled: true,
  getCaptureDiagnostics: mocks.diagnostics,
}));
vi.mock('@/features/capture/detected-intake', () => ({ createDetectedDraft: mocks.createDraft }));
vi.mock('@/features/capture/notification-bridge', () => ({ notificationBridge: { available: false } }));
vi.mock('@/feedback/app-alert', () => ({ AppAlert: { alert: mocks.alert } }));
vi.mock('@/ui/primitives', () => ({ Screen: 'Screen', Card: 'Card', Button: 'Button' }));
vi.mock('@/ui/headers', () => ({ ScreenHeader: 'ScreenHeader' }));
vi.mock('@/ui/states', () => ({ EmptyState: 'EmptyState' }));
vi.mock('@/theme', () => ({ spacing: {}, typography: {} }));

import CaptureDiagnosticsScreen from '@/app/(app)/capture-diagnostics';

let tree: ReactTestRenderer;
const nodes = (name: string) => tree.root.findAll((node) => node.type === name);
const text = () =>
  nodes('Text')
    .map((node) => JSON.stringify(node.props.children))
    .join(' ');
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.state = { status: 'authenticated' };
  mocks.owner = 7;
  mocks.currentUser.mockResolvedValue({ id: 7 });
  mocks.diagnostics.mockImplementation(async (owner: string) => ({
    events:
      owner === '7'
        ? [{ at: new Date().toISOString(), source: 'IMAGE', outcome: 'ACCEPTED', reason: 'SAVED_PENDING' }]
        : [],
  }));
});

it('shows only diagnostics verified for the current account', async () => {
  await act(async () => {
    tree = create(<CaptureDiagnosticsScreen />);
  });
  expect(text()).toContain('Pendiente recibido del servidor');
  mocks.state = { status: 'authenticated' };
  mocks.owner = 8;
  mocks.currentUser.mockResolvedValue({ id: 8 });
  await act(async () => tree.update(<CaptureDiagnosticsScreen />));
  expect(text()).not.toContain('Pendiente recibido del servidor');
  expect(mocks.diagnostics).toHaveBeenCalledWith('8');
});

it('only previews a fictional purchase until the person explicitly confirms a pending draft', async () => {
  await act(async () => {
    tree = create(<CaptureDiagnosticsScreen />);
  });
  const scenario = nodes('Button').find((node) => node.props.children === 'Bancolombia · primera compra')!;
  await act(async () => scenario.props.onPress());
  expect(mocks.createDraft).not.toHaveBeenCalled();
  const save = nodes('Button').find((node) => node.props.children === 'Crear pendiente de prueba')!;
  await act(async () => save.props.onPress());
  expect(mocks.alert).toHaveBeenCalledOnce();
  expect(mocks.createDraft).not.toHaveBeenCalled();
});
