import type { AxiosInstance } from 'axios';

import type { components } from '@/api/generated/schema';
import type { AuthTokens } from './session-types';

export type LoginInput = components['schemas']['LoginRequest'];
export type RegisterInput = components['schemas']['RegisterRequest'];
type AuthResponse = components['schemas']['AuthResponse'];

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
      return toAuthTokens((await http.post<AuthResponse>('/auth/login', input)).data);
    },
    async register(input) {
      return toAuthTokens((await http.post<AuthResponse>('/auth/register', input)).data);
    },
    async refresh(refreshToken) {
      return toAuthTokens((await http.post<AuthResponse>('/auth/refresh', { refreshToken })).data);
    },
    async logout(refreshToken) {
      await http.post('/auth/logout', { refreshToken });
    },
    async logoutAll(accessToken) {
      await http.post('/auth/logout-all', undefined, { headers: { Authorization: `Bearer ${accessToken}` } });
    },
  };
}

function toAuthTokens(response: AuthResponse): AuthTokens {
  if (typeof response.accessToken !== 'string' || typeof response.refreshToken !== 'string') {
    throw new Error('La respuesta de autenticación no incluye una sesión válida.');
  }
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    tokenType: response.tokenType ?? 'Bearer',
    expiresIn: response.expiresIn ?? 0,
  };
}
