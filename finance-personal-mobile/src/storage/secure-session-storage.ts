import * as SecureStore from 'expo-secure-store';

import { createSecureSessionStorage } from './session-storage-core';

export { createSecureSessionStorage } from './session-storage-core';

export const secureSessionStorage = createSecureSessionStorage(SecureStore);
