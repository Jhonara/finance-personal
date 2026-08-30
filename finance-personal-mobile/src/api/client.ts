import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { environment } from '@/config/environment';
import { RefreshCoordinator } from '@/auth/refresh-coordinator';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _financeRetried?: boolean;
    skipAuthRefresh?: boolean;
  }
}

export type ApiSessionDelegate = {
  getAccessToken(): string | null;
  refresh(): Promise<string | null>;
};

export function createApiClient(baseURL: string, session: ApiSessionDelegate): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: environment.requestTimeoutMs,
    headers: { Accept: 'application/json' },
  });
  const coordinator = new RefreshCoordinator();

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = session.getAccessToken();
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const request = error.config;
      if (!request || error.response?.status !== 401 || request._financeRetried || request.skipAuthRefresh) {
        return Promise.reject(error);
      }
      request._financeRetried = true;
      const accessToken = await coordinator.run(() => session.refresh());
      if (!accessToken) return Promise.reject(error);
      request.headers.Authorization = `Bearer ${accessToken}`;
      return client.request(request);
    },
  );
  return client;
}
