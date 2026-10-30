import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => new Map<string, string>());
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => saved.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    saved.set(key, value);
  }),
}));
vi.mock('./environment', () => ({
  environment: { apiBaseUrl: 'http://192.168.1.55:8080/api/v1' },
}));

import { normalizeQaApiBaseUrl } from './qa-api-server';

beforeEach(() => saved.clear());
afterEach(() => vi.unstubAllEnvs());

it('accepts only private LAN addresses on the local backend port', () => {
  expect(normalizeQaApiBaseUrl('192.168.1.70')).toBe('http://192.168.1.70:8080/api/v1');
  expect(normalizeQaApiBaseUrl('http://10.0.0.5:8080/api/v1')).toBe('http://10.0.0.5:8080/api/v1');
  expect(normalizeQaApiBaseUrl('172.16.4.2')).toBe('http://172.16.4.2:8080/api/v1');
});

it.each([
  'localhost',
  '10.0.2.2',
  '8.8.8.8',
  '192.168.1.55:9090',
  'http://192.168.1.55:8080/other',
  'http://user:secret@192.168.1.55:8080/api/v1',
  'https://192.168.1.55:8080/api/v1',
  '192.168.999.1',
])('rejects an unsuitable QA endpoint: %s', (value) => {
  expect(() => normalizeQaApiBaseUrl(value)).toThrow();
});

it('persists a changed LAN address and restores it on the next bootstrap', async () => {
  vi.stubEnv('EXPO_PUBLIC_CAPTURE_QA', 'true');
  vi.resetModules();
  const qa = await import('./qa-api-server');
  await qa.saveQaApiBaseUrl('192.168.1.70');
  expect(saved.size).toBe(1);
  expect(qa.getCurrentApiBaseUrl()).toBe('http://192.168.1.70:8080/api/v1');
  vi.resetModules();
  const afterRestart = await import('./qa-api-server');
  expect(await afterRestart.loadQaApiBaseUrl()).toBe('http://192.168.1.70:8080/api/v1');
});
