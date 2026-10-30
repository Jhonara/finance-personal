import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import axios from 'axios';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { createApiClient, type ApiSessionDelegate } from '@/api/client';
import { environment } from '@/config/environment';
import { getCurrentApiBaseUrl, loadQaApiBaseUrl, saveQaApiBaseUrl } from '@/config/qa-api-server';
import { createAuthApi, type LoginInput, type RegisterInput } from './auth-api';
import { SessionManager } from './session-manager';
import type { SessionState } from './session-types';
import { secureSessionStorage } from '@/storage/secure-session-storage';
import { clearSessionCache } from './session-cache';
import { nativeIntentBridge } from '@/features/shortcuts/native-bridge';
import { homeWidgetBridge } from '@/features/widget/home-widget-bridge';
import { notificationBridge } from '@/features/capture/notification-bridge';
import {
  clearPresentedDetectedNotices,
  invalidateNoticeSession,
  saveNoticeTarget,
} from '@/features/capture/detected-notices';

type AuthContextValue = {
  state: SessionState;
  qaServerUrl: string;
  setQaServer(input: string): Promise<void>;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const rawAuthHttp = axios.create({ baseURL: environment.apiBaseUrl, timeout: environment.requestTimeoutMs });
const sessionManager = new SessionManager(secureSessionStorage, createAuthApi(rawAuthHttp));

export const api = createApiClient(environment.apiBaseUrl, sessionManager satisfies ApiSessionDelegate);

async function clearIncomingAndroidShare() {
  if (Platform.OS !== 'android') return;
  try {
    const { clearSharedPayloads } = await import('expo-sharing');
    clearSharedPayloads();
  } catch {
    // Logging out must continue even if the optional native share module is unavailable.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ status: 'bootstrapping' });
  const [qaServerUrl, setQaServerUrl] = useState(getCurrentApiBaseUrl());
  const queryClient = useQueryClient();

  useEffect(() => {
    void loadQaApiBaseUrl()
      .then(async (baseUrl) => {
        rawAuthHttp.defaults.baseURL = baseUrl;
        api.defaults.baseURL = baseUrl;
        setQaServerUrl(baseUrl);
        return sessionManager.bootstrap();
      })
      .then((next) => {
        if (next.status === 'unauthenticated') notificationBridge.setOwner(null);
        setState(next);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      qaServerUrl,
      async setQaServer(input) {
        if (state.status !== 'unauthenticated') {
          throw new Error('Cierra sesión antes de cambiar el servidor de pruebas.');
        }
        const baseUrl = await saveQaApiBaseUrl(input);
        rawAuthHttp.defaults.baseURL = baseUrl;
        api.defaults.baseURL = baseUrl;
        setQaServerUrl(baseUrl);
        await clearSessionCache(queryClient);
      },
      async login(input) {
        invalidateNoticeSession();
        await clearPresentedDetectedNotices().catch(() => undefined);
        homeWidgetBridge.clear();
        notificationBridge.setOwner(null);
        if (state.status === 'authenticated') await clearIncomingAndroidShare();
        await nativeIntentBridge.setOwner(null);
        await clearSessionCache(queryClient);
        setState(await sessionManager.login(input));
      },
      async register(input) {
        invalidateNoticeSession();
        await clearPresentedDetectedNotices().catch(() => undefined);
        homeWidgetBridge.clear();
        notificationBridge.setOwner(null);
        if (state.status === 'authenticated') await clearIncomingAndroidShare();
        await nativeIntentBridge.setOwner(null);
        await clearSessionCache(queryClient);
        setState(await sessionManager.register(input));
      },
      async logout() {
        invalidateNoticeSession();
        await clearPresentedDetectedNotices().catch(() => undefined);
        await saveNoticeTarget(null).catch(() => undefined);
        homeWidgetBridge.clear();
        notificationBridge.setOwner(null);
        await clearIncomingAndroidShare();
        await nativeIntentBridge.setOwner(null);
        setState({ status: 'bootstrapping' });
        await clearSessionCache(queryClient);
        try {
          await sessionManager.logout();
        } finally {
          await clearSessionCache(queryClient);
          setState({ status: 'unauthenticated' });
        }
      },
      async logoutAll() {
        invalidateNoticeSession();
        await clearPresentedDetectedNotices().catch(() => undefined);
        await saveNoticeTarget(null).catch(() => undefined);
        homeWidgetBridge.clear();
        notificationBridge.setOwner(null);
        await clearIncomingAndroidShare();
        await nativeIntentBridge.setOwner(null);
        setState({ status: 'bootstrapping' });
        await clearSessionCache(queryClient);
        try {
          await sessionManager.logoutAll();
        } finally {
          await clearSessionCache(queryClient);
          setState({ status: 'unauthenticated' });
        }
      },
    }),
    [qaServerUrl, queryClient, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
