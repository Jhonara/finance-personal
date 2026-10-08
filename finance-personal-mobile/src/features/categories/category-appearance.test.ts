import { describe, expect, it } from 'vitest';
import { categoryAppearance, savedCategoryAppearance } from './category-appearance';

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
});
