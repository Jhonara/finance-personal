import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import type { Category } from '@/features/categories/categories-api';

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: object) => styles },
  Platform: { select: (values: Record<string, unknown>) => values.android ?? values.default },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
vi.mock('./primitives', () => ({ SelectField: 'SelectField' }));
vi.mock('./motion', () => ({ MotionPressable: 'Pressable' }));
vi.mock('./modal-selector', () => ({ ModalSelector: 'Selector' }));
vi.mock('./quick-category-modal', () => ({ QuickCategoryModal: 'QuickCategoryModal' }));
import { CategoryHierarchyField } from './category-hierarchy-field';

const categories: Category[] = [
  { id: 1, name: 'Alimentación', type: 'EXPENSE', active: true, iconKey: 'basket-outline' },
  { id: 2, name: 'Desayunos', parentCategoryId: 1, type: 'EXPENSE', active: true },
  { id: 3, name: 'Transporte', type: 'EXPENSE', active: true },
  { id: 4, name: 'Gasolina', parentCategoryId: 3, type: 'EXPENSE', active: true },
  { id: 5, name: 'Ingresos laborales', type: 'INCOME', active: true },
  { id: 6, name: 'Nómina', parentCategoryId: 5, type: 'INCOME', active: true },
  { id: 7, name: 'Inactiva', type: 'EXPENSE', active: false },
];
let tree: ReactTestRenderer;
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
});
async function mount(type: 'EXPENSE' | 'INCOME', initial?: number) {
  const changed = vi.fn();
  function Form() {
    const [value, setValue] = React.useState(initial);
    return (
      <CategoryHierarchyField
        categories={categories}
        type={type}
        value={value}
        onChange={(id) => {
          setValue(id);
          changed(id);
        }}
      />
    );
  }
  await act(async () => {
    tree = create(<Form />);
  });
  return changed;
}
const nodes = (type: string) => tree.root.findAll((node) => (node.type as unknown) === type);
async function choose(label: string, id: number) {
  await act(async () =>
    nodes('SelectField')
      .find((node) => node.props.label === label)!
      .props.onPress(),
  );
  const selector = nodes('Selector').find((node) => node.props.visible)!;
  const options = selector.props.options;
  await act(async () => {
    selector.props.onSelect(id);
    selector.props.onClose();
  });
  return options;
}

it('restores an existing child, then clears its identity when changing the parent', async () => {
  const changed = await mount('EXPENSE', 2);
  expect(nodes('SelectField').map((node) => node.props.value)).toEqual(['Alimentación', 'Desayunos']);
  const parents = await choose('Categoría padre', 3);
  expect(parents.map((item: { id: number }) => item.id)).toEqual([1, 3]);
  expect(changed).toHaveBeenLastCalledWith(3);
  const children = await choose('Subcategoría', 4);
  expect(children.map((item: { id: number }) => item.id)).toEqual([3, 4]);
  expect(changed).toHaveBeenLastCalledWith(4);
});

it('offers only income parents and income children when registering an income', async () => {
  const changed = await mount('INCOME');
  const parents = await choose('Categoría padre', 5);
  expect(parents.map((item: { id: number }) => item.id)).toEqual([5]);
  const children = await choose('Subcategoría', 6);
  expect(children.map((item: { id: number }) => item.id)).toEqual([5, 6]);
  expect(changed).toHaveBeenLastCalledWith(6);
});

it('uses singular for one child and plural for zero or multiple children in the parent selector', async () => {
  await act(async () => {
    tree = create(
      <CategoryHierarchyField
        categories={[
          ...categories,
          { id: 8, name: 'Mantenimiento', parentCategoryId: 3, type: 'EXPENSE', active: true },
          { id: 9, name: 'Hogar', type: 'EXPENSE', active: true },
        ]}
        type="EXPENSE"
        onChange={vi.fn()}
      />,
    );
  });
  const options = nodes('Selector').find((node) => node.props.label === 'Categoría padre')!.props.options;
  const descriptions = Object.fromEntries(
    options.map((item: { label: string; subtitle: string }) => [item.label, item.subtitle]),
  );
  expect(descriptions).toMatchObject({
    Alimentación: '1 subcategoría',
    Transporte: '2 subcategorías',
    Hogar: '0 subcategorías',
  });
});

it('creates a child inside the selected parent and a parent without a parent relationship', async () => {
  await mount('EXPENSE', 1);
  await act(async () =>
    nodes('Pressable')
      .find((node) => node.props.accessibilityLabel === 'Crear subcategoría en Alimentación')!
      .props.onPress(),
  );
  expect(nodes('QuickCategoryModal')[0]!.props).toMatchObject({
    visible: true,
    lockedParentCategoryId: 1,
    rootOnly: false,
  });
  await act(async () => nodes('QuickCategoryModal')[0]!.props.onClose());
  await act(async () =>
    nodes('Pressable')
      .find((node) => node.props.accessibilityLabel === 'Crear categoría padre')!
      .props.onPress(),
  );
  expect(nodes('QuickCategoryModal')[0]!.props).toMatchObject({
    visible: true,
    rootOnly: true,
    lockedParentCategoryId: undefined,
  });
});
