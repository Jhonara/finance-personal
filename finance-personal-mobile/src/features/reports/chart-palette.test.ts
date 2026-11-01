import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  Platform: { select: (values: Record<string, unknown>) => values.default },
}));
import { chartColors, chartContrast, reportPalette } from './chart-palette';

describe('report series palette', () => {
  it('gives more than six categories distinct colors even if every personalized color is identical', () => {
    const keys = Array.from({ length: 80 }, (_, index) => String(index));
    for (const background of ['#FFFFFF', '#132B30']) {
      const palette = reportPalette(keys, background);
      expect(palette.size).toBe(keys.length);
      expect(new Set(palette.values()).size).toBe(keys.length);
      for (const color of palette.values())
        expect(chartContrast(color, background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps a category color stable when sort order or amounts change', () => {
    const keys = ['31', '11', '22', '4'];
    expect(reportPalette(keys)).toEqual(reportPalette([...keys].reverse()));
    expect(reportPalette([...keys, '11'])).toEqual(reportPalette(keys));
  });

  it('adapts color luminance for light and dark surfaces without changing series identity order', () => {
    expect(chartColors('#FFFFFF')).toHaveLength(16);
    expect(chartColors('#132B30')).toHaveLength(16);
    expect(chartColors('#FFFFFF')[0]).not.toEqual(chartColors('#132B30')[0]);
    expect([...reportPalette(['a', 'b'], '#FFFFFF').keys()]).toEqual([
      ...reportPalette(['b', 'a'], '#132B30').keys(),
    ]);
  });
});
