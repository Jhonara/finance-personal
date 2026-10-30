import { beforeEach, expect, it, vi } from 'vitest';

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
