import { describe, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
}));
import { categoryAppearance, savedCategoryAppearance } from './category-appearance';
import { lightPalette, setThemeColors } from '@/theme';

describe('saved category identity', () => {
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
