import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
}));
import {
  categoryAppearance,
  categoryColorAppearance,
  categoryColors,
  savedCategoryAppearance,
} from './category-appearance';
import { darkPalette, lightPalette, setThemeColors } from '@/theme';

function luminance(hex: string) {
  return [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
    const c = parseInt(hex.slice(index * 2 + 1, index * 2 + 3), 16) / 255;
    return sum + weight * (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  }, 0);
}

describe('saved category identity', () => {
  it('keeps all saved category and account color pairs legible in both themes', () => {
    try {
      for (const palette of [lightPalette, darkPalette]) {
        setThemeColors(palette);
        for (const color of categoryColors) {
          const { soft, ink } = categoryColorAppearance(color.key);
          const a = luminance(soft);
          const b = luminance(ink);
          expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), color.key).toBeGreaterThanOrEqual(4.5);
        }
      }
    } finally {
      setThemeColors(lightPalette);
    }
  });
  it('uses the personalized icon and color even when the name changes', () => {
    expect(
      savedCategoryAppearance({
        name: 'Mi proyecto',
        type: 'INCOME',
        iconKey: 'airplane-outline',
        colorKey: 'violet',
      }),
    ).toMatchObject({
      icon: 'airplane-outline',
      soft: '#E9E4FF',
      ink: '#66509E',
    });
  });

  it('keeps older categories readable when no style is stored', () => {
    expect(savedCategoryAppearance({ name: 'Transporte', type: 'EXPENSE' })).toEqual(
      categoryAppearance('Transporte', 'EXPENSE'),
    );
  });

  it('keeps the saved logo and color identity while adapting contrast to dark mode', () => {
    const category = { name: 'Mi proyecto', type: 'INCOME', iconKey: 'airplane-outline', colorKey: 'violet' };
    const light = savedCategoryAppearance(category);
    try {
      setThemeColors({ ...lightPalette, background: '#09191E' });
      const dark = savedCategoryAppearance(category);
      expect(dark.icon).toBe(light.icon);
      expect(dark.colorKey).toBe(light.colorKey);
      expect(dark.soft).not.toBe(light.soft);
      expect(dark.ink).not.toBe(light.ink);
    } finally {
      setThemeColors(lightPalette);
    }
  });
});
