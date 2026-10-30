/// <reference types="node" />
import { createRequire } from 'node:module';
import { afterEach, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const plugin = require('../../plugins/with-android-widget-qa-network.cjs') as (
  config: Record<string, unknown>,
) => { mods?: { android?: { manifest?: unknown } } };
const originalUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const originalQa = process.env.EXPO_PUBLIC_CAPTURE_QA;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = originalUrl;
  if (originalQa === undefined) delete process.env.EXPO_PUBLIC_CAPTURE_QA;
  else process.env.EXPO_PUBLIC_CAPTURE_QA = originalQa;
});

it('enables local HTTP only for a QA endpoint and leaves production unchanged', () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.55:8080/api/v1';
  process.env.EXPO_PUBLIC_CAPTURE_QA = 'true';
  expect(plugin({}).mods?.android?.manifest).toBeDefined();
  process.env.EXPO_PUBLIC_CAPTURE_QA = 'false';
  expect(plugin({}).mods).toBeUndefined();
  process.env.EXPO_PUBLIC_CAPTURE_QA = 'true';
  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.com/api/v1';
  expect(plugin({}).mods).toBeUndefined();
});
