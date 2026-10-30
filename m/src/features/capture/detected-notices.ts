import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Draft } from '@/features/inbox/inbox-api';
import { recordCaptureDiagnostic } from './capture-diagnostics';

export const DETECTED_CHANNEL = 'detected-movements';
export type NoticePreferences = { enabled: boolean; showAmount: boolean; showMerchant: boolean };
export const defaultNoticePreferences: NoticePreferences = {
  enabled: false,
  showAmount: false,
  showMerchant: false,
};
export type NoticeTarget = { ownerId: string; draftId: number };
const targetKey = 'finance.detected-notice.target.v1';
const busy = new Set<string>();
let sessionEpoch = 0;
export const currentNoticeEpoch = () => sessionEpoch;
export const invalidateNoticeSession = () => {
  sessionEpoch += 1;
};

const ownerKey = (ownerId: string) => `finance.detected-notice.prefs.v1.${ownerId}`;
const sentKey = (ownerId: string, draftId: number) => `finance.detected-notice.sent.v1.${ownerId}.${draftId}`;
const notificationId = (ownerId: string, draftId: number) => `detected-${ownerId}-${draftId}`;

export async function getNoticePreferences(ownerId: string): Promise<NoticePreferences> {
  if (!/^\d+$/.test(ownerId)) return defaultNoticePreferences;
  try {
    const raw = await SecureStore.getItemAsync(ownerKey(ownerId));
    if (!raw) return defaultNoticePreferences;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return defaultNoticePreferences;
    const data = saved as Partial<NoticePreferences>;
    return {
      enabled: data.enabled === true,
      showAmount: data.showAmount === true,
      showMerchant: data.showMerchant === true,
    };
  } catch {
    return defaultNoticePreferences;
  }
}

export async function saveNoticePreferences(ownerId: string, prefs: NoticePreferences) {
  if (!/^\d+$/.test(ownerId)) throw new Error('Usuario no verificado.');
  await SecureStore.setItemAsync(ownerKey(ownerId), JSON.stringify(prefs));
}

export async function ensureDetectedChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DETECTED_CHANNEL, {
    name: 'Movimientos detectados',
    description: 'Avisos de movimientos pendientes de revisión',
    importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

export async function requestNoticePermission() {
  if (Platform.OS !== 'android') return false;
  await ensureDetectedChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function safeMerchant(value: string | undefined): string | null {
  const merchant = value?.trim();
  if (
    !merchant ||
    merchant.length > 40 ||
    /\d{5,}|(?:tarjeta|cuenta|clave|token|otp|c[oó]digo)/i.test(merchant)
  )
    return null;
  return /^[\p{L}\p{N} .,'&-]+$/u.test(merchant) ? merchant : null;
}

/** Mark before scheduling: a crash may omit one alert, but cannot emit two for the same pending ID. */
export async function notifyDetectedDraft(
  ownerId: string,
  draft: Draft,
  expectedEpoch = sessionEpoch,
): Promise<boolean> {
  if (Platform.OS !== 'android' || !/^\d+$/.test(ownerId) || !draft.id || draft.status !== 'PENDING')
    return false;
  const key = sentKey(ownerId, draft.id);
  if (busy.has(key)) return false;
  busy.add(key);
  try {
    const prefs = await getNoticePreferences(ownerId);
    if (expectedEpoch !== sessionEpoch || !prefs.enabled || (await SecureStore.getItemAsync(key)))
      return false;
    await ensureDetectedChannel();
    if (!(await Notifications.getPermissionsAsync()).granted || expectedEpoch !== sessionEpoch) {
      if (expectedEpoch === sessionEpoch)
        void recordCaptureDiagnostic(ownerId, 'NOTICE', 'IGNORED', 'NOTICE_BLOCKED').catch(() => undefined);
      return false;
    }
    const merchant = prefs.showMerchant ? safeMerchant(draft.fields?.description) : null;
    const amount =
      prefs.showAmount && draft.fields?.amount && draft.fields.currency
        ? `${new Intl.NumberFormat('es-CO').format(draft.fields.amount)} ${draft.fields.currency}`
        : null;
    const body =
      [merchant, amount].filter(Boolean).join(' · ') || 'Tienes un movimiento pendiente de revisión.';
    await SecureStore.setItemAsync(key, '1');
    if (expectedEpoch !== sessionEpoch) return false;
    const scheduledId = await Notifications.scheduleNotificationAsync({
      identifier: notificationId(ownerId, draft.id),
      content: {
        title: 'Movimiento detectado',
        body,
        data: { type: 'detected-movement', ownerId, draftId: draft.id },
      },
      trigger: { channelId: DETECTED_CHANNEL },
    });
    if (expectedEpoch !== sessionEpoch) {
      await Notifications.dismissNotificationAsync(scheduledId).catch(() => undefined);
      await Notifications.cancelScheduledNotificationAsync(scheduledId).catch(() => undefined);
      return false;
    }
    return true;
  } finally {
    busy.delete(key);
  }
}

export async function dismissDetectedDraft(ownerId: string, draftId: number) {
  if (Platform.OS !== 'android') return;
  await Notifications.dismissNotificationAsync(notificationId(ownerId, draftId)).catch(() => undefined);
  await Notifications.cancelScheduledNotificationAsync(notificationId(ownerId, draftId)).catch(
    () => undefined,
  );
}

export async function clearPresentedDetectedNotices() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.dismissAllNotificationsAsync(),
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.clearLastNotificationResponseAsync(),
  ]);
}

export function parseNoticeTarget(data: Record<string, unknown>): NoticeTarget | null {
  const ownerId = data.ownerId;
  const draftId = data.draftId;
  return data.type === 'detected-movement' &&
    typeof ownerId === 'string' &&
    /^\d+$/.test(ownerId) &&
    typeof draftId === 'number' &&
    Number.isSafeInteger(draftId) &&
    draftId > 0
    ? { ownerId, draftId }
    : null;
}

export async function saveNoticeTarget(target: NoticeTarget | null) {
  if (target) await SecureStore.setItemAsync(targetKey, JSON.stringify(target));
  else await SecureStore.deleteItemAsync(targetKey);
}

export async function loadNoticeTarget(): Promise<NoticeTarget | null> {
  try {
    const raw = await SecureStore.getItemAsync(targetKey);
    return raw ? parseNoticeTarget({ type: 'detected-movement', ...JSON.parse(raw) }) : null;
  } catch {
    return null;
  }
}
