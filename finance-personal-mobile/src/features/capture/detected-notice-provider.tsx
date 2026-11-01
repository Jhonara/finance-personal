import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/auth-provider';
import { toApiError } from '@/api/errors';
import { getCurrentUser } from '@/features/profile/profile-api';
import { getDraft, inboxKeys } from '@/features/inbox/inbox-api';
import { requestFormExit } from '@/features/forms/use-unsaved-form';
import { openForm } from '@/features/forms/form-session';
import { notificationBridge } from './notification-bridge';
import { prepareCaptureText } from './shared-text-intake';
import { captureRejectionReason } from './interpret-text';
import { createDetectedDraft } from './detected-intake';
import { markCaptureSynchronized, recordCaptureDiagnostic } from './capture-diagnostics';
import {
  currentNoticeEpoch,
  loadNoticeTarget,
  parseNoticeTarget,
  saveNoticeTarget,
  type NoticeTarget,
} from './detected-notices';

if (Platform.OS === 'android')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

export function DetectedNoticeProvider({ children }: PropsWithChildren) {
  const { state, logout } = useAuth();
  const client = useQueryClient();
  const [target, setTarget] = useState<NoticeTarget | null>(null);
  const [revision, setRevision] = useState(0);
  const routing = useRef(false);
  const waitingForExit = useRef(false);
  const session = useRef(state);
  session.current = state;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    waitingForExit.current = false;
  }, [state]);
  const syncing = useRef(false);
  const ignoredLogged = useRef(new Set<string>());

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = true;
    const receive = (data: Record<string, unknown> | undefined) => {
      const next = data ? parseNoticeTarget(data) : null;
      if (!next || !active) return;
      waitingForExit.current = false;
      void saveNoticeTarget(next).then(() => {
        if (active) setTarget(next);
      });
    };
    void loadNoticeTarget().then((pending) => {
      if (active && pending) setTarget(pending);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) receive(response.notification.request.content.data);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      receive(response.notification.request.content.data),
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const syncBankNotices = useCallback(async () => {
    if (state.status !== 'authenticated' || !notificationBridge.available || syncing.current) return;
    try {
      if (!notificationBridge.status().enabled) return;
    } catch {
      return;
    }
    syncing.current = true;
    const epoch = currentNoticeEpoch();
    try {
      const user = await getCurrentUser();
      if (!user.id || epoch !== currentNoticeEpoch()) return;
      const ownerId = String(user.id);
      notificationBridge.setOwner(ownerId);
      let completed = true;
      for (const notice of notificationBridge.pending(ownerId)) {
        if (epoch !== currentNoticeEpoch()) {
          completed = false;
          break;
        }
        const intake = prepareCaptureText(notice.text, 'NOTIFICATION');
        if (!intake) {
          if (!ignoredLogged.current.has(`${ownerId}:${notice.id}`)) {
            ignoredLogged.current.add(`${ownerId}:${notice.id}`);
            void recordCaptureDiagnostic(
              ownerId,
              'NOTIFICATION',
              'IGNORED',
              captureRejectionReason(notice.text) ?? 'NO_MOVEMENT',
            ).catch(() => undefined);
          }
          continue;
        }
        try {
          await createDetectedDraft(intake, notice.id.slice(0, 32), ownerId);
          if (epoch !== currentNoticeEpoch()) {
            completed = false;
            break;
          }
          notificationBridge.acknowledge(ownerId, notice.id);
          void client.invalidateQueries({ queryKey: inboxKeys.all });
        } catch {
          // Keep the encrypted native candidate to retry when the connection returns.
          completed = false;
          break;
        }
      }
      if (completed) void markCaptureSynchronized(ownerId).catch(() => undefined);
    } catch {
      // An expired or offline session never publishes another owner's candidates.
    } finally {
      syncing.current = false;
    }
  }, [state.status, client]);

  useEffect(() => {
    if (Platform.OS !== 'android' || state.status !== 'authenticated') return;
    void syncBankNotices();
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void syncBankNotices();
    }, 15_000);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        waitingForExit.current = false;
        void syncBankNotices();
        setRevision((value) => value + 1);
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [state.status, syncBankNotices]);

  useEffect(() => {
    if (!target || routing.current || waitingForExit.current) return;
    if (state.status !== 'authenticated') {
      if (state.status === 'unauthenticated') router.replace('/(auth)/login');
      return;
    }
    routing.current = true;
    const epoch = currentNoticeEpoch();
    const startedSession = state;
    const current = () =>
      mounted.current && session.current === startedSession && epoch === currentNoticeEpoch();
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (!current()) return;
        if (String(user.id) !== target.ownerId) {
          await saveNoticeTarget(null);
          await Notifications.clearLastNotificationResponseAsync();
          setTarget(null);
          return;
        }
        await getDraft(target.draftId);
        if (!current()) return;
        waitingForExit.current = true;
        requestFormExit(() => {
          if (!current()) {
            waitingForExit.current = false;
            return;
          }
          void (async () => {
            await saveNoticeTarget(null);
            if (!current()) return;
            await Notifications.clearLastNotificationResponseAsync();
            if (!current()) return;
            setTarget(null);
            openForm('/(app)/purchase-review', { id: String(target.draftId) });
          })()
            .catch(() => {
              waitingForExit.current = false;
            })
            .finally(() => {
              routing.current = false;
            });
        });
      } catch (error) {
        if (!current()) return;
        const status = toApiError(error).status;
        if (status === 401) {
          await logout();
          await saveNoticeTarget(target);
          router.replace('/(auth)/login');
        } else if (status === 404) {
          await saveNoticeTarget(null);
          await Notifications.clearLastNotificationResponseAsync();
          setTarget(null);
          router.replace('/(app)/inbox');
        }
        // Offline: keep the target and retry when the app becomes active.
      } finally {
        routing.current = false;
      }
    })();
  }, [target, state.status, logout, revision]);

  useEffect(() => {
    if (!target || state.status !== 'authenticated') return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') setRevision((value) => value + 1);
    }, 15_000);
    return () => clearInterval(interval);
  }, [target, state.status]);

  return children;
}
