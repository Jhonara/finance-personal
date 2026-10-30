import { vi } from 'vitest';

// Metro supplies these globals on devices; Vitest renders components in Node.
vi.stubGlobal('__DEV__', true);
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

// The native status bar starts Expo's device runtime in SDK 58. Keep its props
// visible to component tests without starting a native runtime inside Node.
vi.mock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));

// Local notifications require the Android/iOS runtime. Tests override these spies
// when checking delivery, permissions, and navigation.
vi.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  AndroidNotificationVisibility: { PRIVATE: 2 },
  setNotificationHandler: vi.fn(),
  setNotificationChannelAsync: vi.fn(async () => null),
  getPermissionsAsync: vi.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: false, canAskAgain: false })),
  scheduleNotificationAsync: vi.fn(async () => 'test-notice'),
  dismissNotificationAsync: vi.fn(async () => undefined),
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  dismissAllNotificationsAsync: vi.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: vi.fn(async () => undefined),
  getLastNotificationResponseAsync: vi.fn(async () => null),
  clearLastNotificationResponseAsync: vi.fn(async () => undefined),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));
