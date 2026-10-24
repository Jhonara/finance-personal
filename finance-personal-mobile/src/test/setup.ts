import { vi } from 'vitest';

// Metro supplies these globals on devices; Vitest renders components in Node.
vi.stubGlobal('__DEV__', true);
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

// The native status bar starts Expo's device runtime in SDK 58. Keep its props
// visible to component tests without starting a native runtime inside Node.
vi.mock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
