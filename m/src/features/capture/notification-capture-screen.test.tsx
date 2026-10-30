import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { status: 'authenticated', tokens: { accessToken: 'user-7' } } as {
    status: string;
    tokens: { accessToken: string };
  },
  profile: vi.fn(),
  logout: vi.fn(),
  setOwner: vi.fn(),
  setEnabled: vi.fn(),
  setApps: vi.fn(),
  acknowledge: vi.fn(),
  discard: vi.fn(),
  pending: vi.fn(),
  status: vi.fn(),
}));
vi.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ state: mocks.auth, logout: mocks.logout }) }));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: mocks.profile }));
vi.mock('@/api/errors', () => ({ toApiError: (error: { status?: number }) => error }));
vi.mock('@/privacy/privacy-provider', () => ({ usePrivacy: () => ({ hidden: false }) }));
vi.mock('@/features/capture/notification-bridge', () => ({
  notificationBridge: {
    available: true,
    setOwner: mocks.setOwner,
    setEnabled: mocks.setEnabled,
    setApps: mocks.setApps,
    acknowledge: mocks.acknowledge,
    discard: mocks.discard,
    pending: mocks.pending,
    status: mocks.status,
    openSettings: vi.fn(),
  },
}));
vi.mock('expo-router', () => ({ router: { back: vi.fn() } }));
vi.mock('react-native', () => ({ Text: 'Text' }));
vi.mock('@/ui/primitives', () => ({ Screen: 'Screen', Card: 'Card', Button: 'Button' }));
vi.mock('@/ui/headers', () => ({ ScreenHeader: 'ScreenHeader' }));
vi.mock('@/ui/states', () => ({ EmptyState: 'EmptyState', SkeletonRow: 'SkeletonRow' }));
vi.mock('@/theme', () => ({ spacing: {}, typography: {} }));
vi.mock('@/app/(app)/purchase-review', () => ({ PurchaseEditor: 'PurchaseEditor' }));
vi.mock('@/features/capture/use-detected-drafts', () => ({
  useDetectedDrafts: () => ({
    saved: new Proxy({}, { get: () => ({ id: 91, fields: { amount: 25000 }, status: 'PENDING' }) }),
    errors: {},
    retry: vi.fn(),
  }),
}));

import CaptureNotificationsScreen from '@/app/(app)/capture-notifications';

let tree: ReactTestRenderer;
const nodes = (name: string) => tree.root.findAll((node) => node.type === name);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.auth = { status: 'authenticated', tokens: { accessToken: 'user-7' } };
  mocks.profile.mockResolvedValue({ id: 7 });
  mocks.status.mockReturnValue({
    enabled: true,
    accessGranted: true,
    observed: ['com.bank'],
    allowed: ['com.bank'],
    pendingCount: 1,
  });
  mocks.pending.mockReturnValue([
    {
      id: 'abcdef1234567890',
      text: 'Compraste COP 25.000 en Mercado el 25/10/2026',
      packageName: 'com.bank',
      postedAt: 1,
    },
  ]);
});

it('verifies the user before showing notices and opens the saved pending item', async () => {
  await act(async () => {
    tree = create(<CaptureNotificationsScreen />);
  });
  expect(mocks.profile).toHaveBeenCalledOnce();
  expect(mocks.setOwner).toHaveBeenCalledWith('7');
  expect(mocks.setEnabled).not.toHaveBeenCalled();
  expect(mocks.acknowledge).not.toHaveBeenCalled();
  expect(nodes('PurchaseEditor')).toHaveLength(0);
  const review = nodes('Button').find((node) => node.props.children === 'Revisar y corregir')!;
  await act(async () => review.props.onPress());
  expect(nodes('PurchaseEditor')[0]?.props.initial).toMatchObject({ id: 91 });
  expect(mocks.acknowledge).not.toHaveBeenCalled();
  await act(async () => nodes('PurchaseEditor')[0]!.props.onSavedImport());
  expect(mocks.acknowledge).toHaveBeenCalledWith('7', 'abcdef1234567890');
  expect(mocks.discard).not.toHaveBeenCalled();
});

it('records an explicit local discard without treating it as a saved pending item', async () => {
  await act(async () => {
    tree = create(<CaptureNotificationsScreen />);
  });
  const button = nodes('Button').find((node) => node.props.children === 'Descartar aviso')!;
  await act(async () => button.props.onPress());
  expect(mocks.discard).toHaveBeenCalledWith('7', 'abcdef1234567890');
  expect(mocks.acknowledge).not.toHaveBeenCalled();
});

it('does not show locally queued data when session verification fails', async () => {
  mocks.profile.mockRejectedValueOnce({ status: 503 });
  await act(async () => {
    tree = create(<CaptureNotificationsScreen />);
  });
  expect(mocks.pending).not.toHaveBeenCalled();
  expect(nodes('PurchaseEditor')).toHaveLength(0);
  expect(nodes('EmptyState')[0]?.props.title).toBe('No pudimos comprobar tu sesión');
});

it('hides the previous user notice while a new session is being verified', async () => {
  await act(async () => {
    tree = create(<CaptureNotificationsScreen />);
  });
  await act(async () =>
    nodes('Button')
      .find((node) => node.props.children === 'Revisar y corregir')
      ?.props.onPress(),
  );
  expect(nodes('PurchaseEditor')).toHaveLength(1);
  let finishVerification: ((user: { id: number }) => void) | undefined;
  mocks.profile.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishVerification = resolve;
      }),
  );
  mocks.auth = { status: 'authenticated', tokens: { accessToken: 'user-8' } };
  await act(async () => tree.update(<CaptureNotificationsScreen />));
  expect(nodes('PurchaseEditor')).toHaveLength(0);
  expect(nodes('SkeletonRow')).toHaveLength(1);
  await act(async () => finishVerification?.({ id: 8 }));
  expect(mocks.setOwner).toHaveBeenCalledWith('8');
  expect(nodes('PurchaseEditor')).toHaveLength(0);
});
