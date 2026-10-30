import { requireOptionalNativeModule } from 'expo';

export type NotificationStatus = {
  enabled: boolean;
  accessGranted: boolean;
  observed: string[];
  allowed: string[];
  pendingCount: number;
};
export type PendingNotification = {
  id: string;
  text: string;
  packageName: string;
  postedAt: number;
};
export type NativeCaptureDiagnostic = {
  at: number;
  outcome: 'ACCEPTED' | 'IGNORED' | 'DISCARDED' | 'FAILED';
  reason:
    | 'EMPTY_TEXT'
    | 'AUTH_MESSAGE'
    | 'NO_MOVEMENT'
    | 'DUPLICATE_EVENT'
    | 'QUEUE_FULL'
    | 'QUEUED_ENCRYPTED'
    | 'USER_DISCARDED'
    | 'LISTENER_ERROR';
};
type NativeNotificationCapture = {
  notificationStatus(): NotificationStatus;
  setNotificationOwner(owner: string | null): void;
  setNotificationEnabled(enabled: boolean): void;
  setNotificationApps(allowed: string[]): void;
  pendingNotifications(owner: string): PendingNotification[];
  captureDiagnosticEvents?(owner: string): NativeCaptureDiagnostic[];
  ackNotification(owner: string, id: string): void;
  discardNotification?(owner: string, id: string): void;
  openNotificationSettings(): void;
};
const native = requireOptionalNativeModule<NativeNotificationCapture>('FinanceCaptureOcr');
const requireNative = () => {
  if (!native) throw new Error('Esta compilación aún no incluye la captura de notificaciones.');
  return native;
};
export const notificationBridge = {
  available: native !== null,
  status: () => requireNative().notificationStatus(),
  setOwner: (owner: string | null) => native?.setNotificationOwner(owner),
  setEnabled: (enabled: boolean) => requireNative().setNotificationEnabled(enabled),
  setApps: (apps: string[]) => requireNative().setNotificationApps(apps),
  pending: (owner: string) => requireNative().pendingNotifications(owner),
  diagnostics: (owner: string) => requireNative().captureDiagnosticEvents?.(owner) ?? [],
  acknowledge: (owner: string, id: string) => requireNative().ackNotification(owner, id),
  discard: (owner: string, id: string) => {
    const module = requireNative();
    if (module.discardNotification) module.discardNotification(owner, id);
    else module.ackNotification(owner, id);
  },
  openSettings: () => requireNative().openNotificationSettings(),
};
