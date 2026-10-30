import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  state: { status: 'unauthenticated' } as { status: string },
  logout: vi.fn(),
  user: vi.fn(),
  draft: vi.fn(),
  replace: vi.fn(),
  openForm: vi.fn(),
  lastResponse: vi.fn(),
  clearResponse: vi.fn(),
  listener: vi.fn(),
  saveTarget: vi.fn(),
  loadTarget: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: vi.fn() }) },
}));
vi.mock('expo-router', () => ({ router: { replace: mocks.replace } }));
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  getLastNotificationResponseAsync: mocks.lastResponse,
  addNotificationResponseReceivedListener: mocks.listener,
  clearLastNotificationResponseAsync: mocks.clearResponse,
}));
vi.mock('@/auth/auth-provider', () => ({
  useAuth: () => ({ state: mocks.state, logout: mocks.logout }),
  api: {},
}));
vi.mock('@/api/errors', () => ({ toApiError: (error: { status?: number }) => error }));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: mocks.user }));
vi.mock('@/features/inbox/inbox-api', () => ({ getDraft: mocks.draft, inboxKeys: { all: ['inbox'] } }));
vi.mock('@/features/forms/form-session', () => ({ openForm: mocks.openForm }));
vi.mock('@/features/capture/notification-bridge', () => ({ notificationBridge: { available: false } }));
vi.mock('@/features/capture/detected-intake', () => ({ createDetectedDraft: vi.fn() }));
vi.mock('@/features/capture/detected-notices', () => ({
  currentNoticeEpoch: () => 0,
  clearPresentedDetectedNotices: vi.fn(async () => undefined),
  loadNoticeTarget: mocks.loadTarget,
  saveNoticeTarget: mocks.saveTarget,
  parseNoticeTarget: (data: { type: string; ownerId: string; draftId: number }) =>
    data.type === 'detected-movement' ? { ownerId: data.ownerId, draftId: data.draftId } : null,
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));

import { DetectedNoticeProvider } from './detected-notice-provider';

let tree: ReactTestRenderer;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.state = { status: 'unauthenticated' };
  mocks.user.mockResolvedValue({ id: 7 });
  mocks.draft.mockResolvedValue({ id: 41, status: 'PENDING' });
  mocks.loadTarget.mockResolvedValue(null);
  mocks.saveTarget.mockResolvedValue(undefined);
  mocks.clearResponse.mockResolvedValue(undefined);
  mocks.lastResponse.mockResolvedValue({
    notification: {
      request: { content: { data: { type: 'detected-movement', ownerId: '7', draftId: 41 } } },
    },
  });
  mocks.listener.mockReturnValue({ remove: vi.fn() });
});

it('retains the tapped pending ID through login and opens its real review route', async () => {
  await act(async () => {
    tree = create(
      <DetectedNoticeProvider>
        <React.Fragment />
      </DetectedNoticeProvider>,
    );
  });
  expect(mocks.saveTarget).toHaveBeenCalledWith({ ownerId: '7', draftId: 41 });
  expect(mocks.replace).toHaveBeenCalledWith('/(auth)/login');
  expect(mocks.openForm).not.toHaveBeenCalled();
  mocks.state = { status: 'authenticated' };
  await act(async () =>
    tree.update(
      <DetectedNoticeProvider>
        <React.Fragment />
      </DetectedNoticeProvider>,
    ),
  );
  expect(mocks.user).toHaveBeenCalled();
  expect(mocks.draft).toHaveBeenCalledWith(41);
  expect(mocks.openForm).toHaveBeenCalledWith('/(app)/purchase-review', { id: '41' });
});

it('never opens a pending movement belonging to another user', async () => {
  mocks.state = { status: 'authenticated' };
  mocks.user.mockResolvedValue({ id: 8 });
  await act(async () => {
    tree = create(
      <DetectedNoticeProvider>
        <React.Fragment />
      </DetectedNoticeProvider>,
    );
  });
  expect(mocks.draft).not.toHaveBeenCalled();
  expect(mocks.openForm).not.toHaveBeenCalled();
  expect(mocks.saveTarget).toHaveBeenCalledWith(null);
  await act(async () => tree.unmount());
});

it('asks for login on an expired session and preserves the tapped ID', async () => {
  mocks.state = { status: 'authenticated' };
  mocks.user.mockRejectedValue({ status: 401 });
  mocks.logout.mockResolvedValue(undefined);
  await act(async () => {
    tree = create(
      <DetectedNoticeProvider>
        <React.Fragment />
      </DetectedNoticeProvider>,
    );
  });
  expect(mocks.logout).toHaveBeenCalledOnce();
  expect(mocks.saveTarget).toHaveBeenCalledWith({ ownerId: '7', draftId: 41 });
  expect(mocks.replace).toHaveBeenCalledWith('/(auth)/login');
  expect(mocks.openForm).not.toHaveBeenCalled();
});

it('keeps the target when the network fails instead of opening unverified data', async () => {
  mocks.state = { status: 'authenticated' };
  mocks.user.mockRejectedValue({ status: 503 });
  await act(async () => {
    tree = create(
      <DetectedNoticeProvider>
        <React.Fragment />
      </DetectedNoticeProvider>,
    );
  });
  expect(mocks.saveTarget).toHaveBeenCalledWith({ ownerId: '7', draftId: 41 });
  expect(mocks.saveTarget).not.toHaveBeenCalledWith(null);
  expect(mocks.openForm).not.toHaveBeenCalled();
});
