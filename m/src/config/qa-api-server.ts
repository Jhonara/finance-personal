import * as SecureStore from 'expo-secure-store';

import { environment } from './environment';

const STORAGE_KEY = 'finance_qa_api_base_url';

export const qaApiServerEnabled = process.env.EXPO_PUBLIC_CAPTURE_QA === 'true';

let currentApiBaseUrl = environment.apiBaseUrl;

export function getCurrentApiBaseUrl(): string {
  return currentApiBaseUrl;
}

export function normalizeQaApiBaseUrl(input: string): string {
  const value = input.trim();
  const candidate = /^\d/.test(value) ? `http://${value}` : value;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Escribe la IP privada de tu computador, por ejemplo 192.168.1.55.');
  }
  const parts = url.hostname.split('.').map(Number);
  const privateIpv4 =
    parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (parts[0] === 10 ||
      (parts[0] === 172 && (parts[1] ?? 0) >= 16 && (parts[1] ?? 0) <= 31) ||
      (parts[0] === 192 && parts[1] === 168));
  if (
    !privateIpv4 ||
    url.hostname === '10.0.2.2' ||
    url.protocol !== 'http:' ||
    (url.port && url.port !== '8080') ||
    (url.pathname !== '/' && url.pathname !== '/api/v1') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Usa una IP privada de tu red, con el puerto 8080 y sin datos adicionales.');
  }
  return `http://${url.hostname}:8080/api/v1`;
}

export async function loadQaApiBaseUrl(): Promise<string> {
  if (!qaApiServerEnabled) return currentApiBaseUrl;
  try {
    const saved = await SecureStore.getItemAsync(STORAGE_KEY);
    if (saved) currentApiBaseUrl = normalizeQaApiBaseUrl(saved);
  } catch {
    // A corrupt or unavailable preference must not prevent the login screen from opening.
  }
  return currentApiBaseUrl;
}

export async function saveQaApiBaseUrl(input: string): Promise<string> {
  if (!qaApiServerEnabled) throw new Error('El servidor de QA no está disponible en esta versión.');
  const next = normalizeQaApiBaseUrl(input);
  await SecureStore.setItemAsync(STORAGE_KEY, next);
  currentApiBaseUrl = next;
  return next;
}
