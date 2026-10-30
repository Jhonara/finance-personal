import { describe, expect, it } from 'vitest';
import { formatLocalDate, nativeFromLocalDate, localDateFromNative } from './local-date';

describe('LocalDate presentation', () => {
  it.each(['America/Bogota', 'Pacific/Honolulu', 'Pacific/Kiritimati', 'UTC'])(
    'preserves calendar components in %s',
    (zone) => {
      const previous = process.env.TZ;
      try {
        process.env.TZ = zone;
        expect(formatLocalDate('2026-09-16')).toBe('16 de septiembre de 2026');
        expect(formatLocalDate('2026-09-16', 'compact')).toBe('16 sep 2026');
        expect(localDateFromNative(nativeFromLocalDate('2026-09-16'))).toBe('2026-09-16');
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    },
  );
  it('handles missing and invalid dates without showing technical values', () => {
    for (const value of [undefined, '', '2026-02-29', '2026-13-01', 'bad'])
      expect(formatLocalDate(value)).toBe('Fecha no disponible');
    expect(formatLocalDate('2028-02-29')).toBe('29 de febrero de 2028');
  });
});
