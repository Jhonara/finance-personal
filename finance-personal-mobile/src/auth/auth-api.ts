import type { AxiosInstance } from 'axios';

import type { AuthTokens } from './session-types';

export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { name: string };

export interface AuthApi {
  login(input: LoginInput): Promise<AuthTokens>;
  register(input: RegisterInput): Promise<AuthTokens>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(refreshToken: string): Promise<void>;
  logoutAll(accessToken: string): Promise<void>;
}

export function createAuthApi(http: AxiosInstance): AuthApi {
  return {
    async login(input) {
      return (await http.post<AuthTokens>('/auth/login', input)).data;
    },
    async register(input) {
      return (await http.post<AuthTokens>('/auth/register', input)).data;
    },
    async refresh(refreshToken) {
      return (await http.post<AuthTokens>('/auth/refresh', { refreshToken })).data;
    },
    async logout(refreshToken) {
      await http.post('/auth/logout', { refreshToken });
    },
    async logoutAll(accessToken) {
      await http.post('/auth/logout-all', undefined, { headers: { Authorization: `Bearer ${accessToken}` } });
    },
  };
}
