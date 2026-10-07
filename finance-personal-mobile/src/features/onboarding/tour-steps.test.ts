import { describe, expect, it } from 'vitest';
import { parseTourProgress, tourKey, tourSteps } from './tour-steps';
import { dockIndex } from '@/ui/navigation-model';
import { categoryAppearance } from '@/features/categories/category-appearance';

describe('interactive tour preferences', () => {
  it('rejects corrupt and out-of-range saved steps, independently per user', () => {
    for (const raw of [null, '{', 'null', '{"step":-1}', '{"step":500}', '{"step":1.2}'])
      expect(parseTourProgress(raw)).toEqual({ step: 0, done: false });
    expect(parseTourProgress('{"step":3,"done":true}')).toEqual({ step: 3, done: true });
    expect(tourKey(1)).not.toEqual(tourKey(2));
  });
  it('includes categories and only takes the user to read-only screens', () => {
    expect(tourSteps.some((step) => step.id === 'categories')).toBe(true);
    expect(tourSteps.every((step) => !/form|new-|payment/.test(step.route))).toBe(true);
  });
  it('keeps the parent destination selected for internal routes', () => {
    expect(dockIndex('credit-amortization')).toBe(4);
    expect(dockIndex('budget-detail')).toBe(4);
    expect(dockIndex('saving-detail')).toBe(4);
    expect(dockIndex('account-detail')).toBe(3);
    expect(dockIndex('guide')).toBe(0);
  });
  it('uses icons for known names without turning a custom name into another category', () => {
    expect(categoryAppearance('Alimentación').icon).toBe('restaurant-outline');
    expect(categoryAppearance('NÓMINA', 'INCOME').icon).toBe('briefcase-outline');
    expect(categoryAppearance('Mi categoría personal').icon).toBe('pricetag-outline');
  });
});
