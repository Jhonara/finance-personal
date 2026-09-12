import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import { createApiClient, type ApiSessionDelegate } from '@/api/client';
import { environment } from '@/config/environment';
import { createAuthApi, type LoginInput, type RegisterInput } from './auth-api';
import { SessionManager } from './session-manager';
import type { SessionState } from './session-types';
import { secureSessionStorage } from '@/storage/secure-session-storage';
import { removeCurrentUserCache } from '@/features/profile/profile-cache';

type AuthContextValue = {
  state: SessionState;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const rawAuthHttp = axios.create({ baseURL: environment.apiBaseUrl, timeout: environment.requestTimeoutMs });
const sessionManager = new SessionManager(secureSessionStorage, createAuthApi(rawAuthHttp));

export const api = createApiClient(environment.apiBaseUrl, sessionManager satisfies ApiSessionDelegate);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ status: 'bootstrapping' });
  const queryClient = useQueryClient();

  useEffect(() => {
    void sessionManager.bootstrap().then(setState);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      async login(input) {
        removeCurrentUserCache(queryClient);
        setState(await sessionManager.login(input));
      },
      async register(input) {
        removeCurrentUserCache(queryClient);
        setState(await sessionManager.register(input));
      },
      async logout() {
        try {
          await sessionManager.logout();
        } finally {
          removeCurrentUserCache(queryClient);
          setState({ status: 'unauthenticated' });
        }
      },
      async logoutAll() {
        try {
          await sessionManager.logoutAll();
        } finally {
          removeCurrentUserCache(queryClient);
          setState({ status: 'unauthenticated' });
        }
      },
    }),
    [queryClient, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
