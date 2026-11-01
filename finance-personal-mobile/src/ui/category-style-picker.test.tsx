import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: object) => styles },
  Platform: { select: (values: Record<string, unknown>) => values.default },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
vi.mock('./primitives', () => ({ Input: 'Input' }));
vi.mock('./motion', () => ({ MotionPressable: 'Pressable' }));
import { CategoryStylePicker } from './category-style-picker';
import {
  categoryIcons,
  filterCategoryIcons,
  savedCategoryAppearance,
} from '@/features/categories/category-appearance';
let tree: ReactTestRenderer | undefined;
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
});
it('offers a larger unique catalog, searches accents and combines groups with search', () => {
  expect(categoryIcons.length).toBeGreaterThan(60);
  expect(new Set(categoryIcons.map((icon) => icon.key)).size).toBe(categoryIcons.length);
  expect(filterCategoryIcons('cafe').map((icon) => icon.key)).toContain('cafe-outline');
  expect(filterCategoryIcons('tarjeta', 'food')).toEqual([]);
  expect(filterCategoryIcons('tarjeta', 'work').map((icon) => icon.key)).toEqual(['card-outline']);
  expect(savedCategoryAppearance({ iconKey: 'future-unknown-icon' }).icon).toBe('pricetag-outline');
});
it('keeps the current preview while searching, then returns explicit icon and color keys', async () => {
  const icon = vi.fn(),
    color = vi.fn();
  await act(async () => {
    tree = create(
      <CategoryStylePicker
        iconKey="basket-outline"
        colorKey="mint"
        onIconChange={icon}
        onColorChange={color}
      />,
    );
  });
  await act(async () => tree!.root.findByType('Input' as never).props.onChangeText('tarjeta'));
  const buttons = () => tree!.root.findAllByType('Pressable' as never);
  expect(buttons().filter((node) => node.props.accessibilityLabel?.startsWith('Ícono '))).toHaveLength(1);
  expect(
    tree!.root.findAll((node) => node.props.accessibilityLabel === 'Vista previa: Mercado'),
  ).toHaveLength(1);
  await act(async () =>
    buttons()
      .find((node) => node.props.accessibilityLabel === 'Ícono Tarjeta')!
      .props.onPress(),
  );
  await act(async () =>
    buttons()
      .find((node) => node.props.accessibilityLabel === 'Color Violeta')!
      .props.onPress(),
  );
  expect(icon).toHaveBeenCalledExactlyOnceWith('card-outline');
  expect(color).toHaveBeenCalledExactlyOnceWith('violet');
});
