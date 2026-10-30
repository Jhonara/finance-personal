import type {
  NotificationStatus,
  PendingNotification,
  NativeCaptureDiagnostic,
} from './notification-bridge.android';
export type {
  NotificationStatus,
  PendingNotification,
  NativeCaptureDiagnostic,
} from './notification-bridge.android';

const unavailable = (): never => {
  throw new Error('La captura de notificaciones está disponible en Android.');
};
export const notificationBridge = {
  available: false,
  status: (): NotificationStatus => unavailable(),
  setOwner: (_owner: string | null) => {
    void _owner;
  },
  setEnabled: (_enabled: boolean) => {
    void _enabled;
    unavailable();
  },
  setApps: (_apps: string[]) => {
    void _apps;
    unavailable();
  },
  pending: (_owner: string): PendingNotification[] => {
    void _owner;
    return unavailable();
  },
  diagnostics: (_owner: string): NativeCaptureDiagnostic[] => {
    void _owner;
    return unavailable();
  },
  acknowledge: (_owner: string, _id: string) => {
    void _owner;
    void _id;
    unavailable();
  },
  discard: (_owner: string, _id: string) => {
    void _owner;
    void _id;
    unavailable();
  },
  openSettings: () => unavailable(),
};
