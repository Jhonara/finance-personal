export type AppEnvironment = 'local' | 'development' | 'staging' | 'production';

const configuredEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? 'local';

if (!['local', 'development', 'staging', 'production'].includes(configuredEnvironment)) {
  throw new Error('EXPO_PUBLIC_APP_ENV must be local, development, staging, or production.');
}

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL is required. Copy .env.example and configure the active environment.',
  );
}

export const environment = {
  name: configuredEnvironment as AppEnvironment,
  apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
  requestTimeoutMs: 15_000,
} as const;
