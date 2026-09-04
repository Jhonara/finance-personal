import { describe, it, expect } from 'vitest';
import { localDateFromNative } from './local-date';
describe('LocalDate', () => {
  it('pads month and day without UTC conversion', () =>
    expect(localDateFromNative(new Date(2026, 0, 3))).toBe('2026-01-03'));
});
