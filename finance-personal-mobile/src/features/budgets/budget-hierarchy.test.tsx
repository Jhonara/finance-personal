import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '@/features/categories/categories-api';
import type { Budget } from '@/features/secondary/secondary-api';

const mocks = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  categories: [] as Category[],
  budgets: [] as Budget[],
  hidden: false,
  create: vi.fn(),
  update: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  feedback: vi.fn(),
}));
vi.mock('react-native', () => {
  const host =
    (name: string) =>
    ({ children, ...props }: React.PropsWithChildren<object>) =>
      React.createElement(name, props, children);
  return {
    StyleSheet: { create: (styles: object) => styles },
    Text: host('Text'),
    View: host('View'),
    useWindowDimensions: () => ({ width: 390, fontScale: 1 }),
    Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
  };
});
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: (props: object) => React.createElement('Icon', props),
}));
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: React.PropsWithChildren) => React.createElement('Gradient', null, children),
}));
vi.mock('expo-router', () => ({
  router: { push: mocks.push, replace: mocks.replace, back: vi.fn() },
  useLocalSearchParams: () => mocks.params,
}));
vi.mock('@/features/categories/use-categories', () => ({
  useCategories: () => ({ data: mocks.categories, isPending: false }),
}));
vi.mock('@/features/secondary/use-secondary', () => ({
  useChangeBudgetState: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBudgets: () => ({ data: mocks.budgets, isPending: false, refetch: vi.fn() }),
  useCreateBudget: () => ({ mutate: mocks.create, isPending: false, reset: vi.fn() }),
  useUpdateBudget: () => ({ mutate: mocks.update, isPending: false, reset: vi.fn() }),
}));
vi.mock('@/features/forms/form-session', () => ({
  withFormSession: (component: unknown) => component,
  useFormSessionActive: () => () => true,
  openForm: (pathname: string, params: object) => mocks.push({ pathname, params }),
}));
vi.mock('@/features/forms/use-unsaved-form', () => ({
  useUnsavedForm: () => ({ request: (action: () => void) => action() }),
}));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.feedback }) }));
vi.mock('@/features/onboarding/tour-context', () => ({ useTour: () => undefined }));
vi.mock('@/privacy/privacy-provider', () => ({ usePrivacy: () => ({ hidden: mocks.hidden }) }));
vi.mock('@/ui/primitives', () => {
  const host =
    (name: string) =>
    ({ children, ...props }: React.PropsWithChildren<object>) =>
      React.createElement(name, props, children);
  return {
    Button: host('Button'),
    Card: host('Card'),
    MoneyInput: host('MoneyInput'),
    Screen: host('Screen'),
    SelectField: host('SelectField'),
    IconButton: host('IconButton'),
  };
});
vi.mock('@/ui/motion', () => ({
  MotionPressable: ({ children, ...props }: React.PropsWithChildren<object>) =>
    React.createElement('Pressable', props, children),
}));
vi.mock('@/ui/modal-selector', () => ({
  ModalSelector: (props: object) => React.createElement('Selector', props),
}));
vi.mock('@/ui/quick-category-modal', () => ({
  QuickCategoryModal: (props: object) => React.createElement('QuickCategoryModal', props),
}));
vi.mock('@/ui/headers', () => ({
  ScreenHeader: (props: object) => React.createElement('Header', props),
  SectionHeader: (props: object) => React.createElement('SectionHeader', props),
}));
vi.mock('@/ui/progress', () => ({ Progress: (props: object) => React.createElement('Progress', props) }));
vi.mock('@/ui/states', () => ({
  EmptyState: (props: object) => React.createElement('EmptyState', props),
  ErrorState: () => null,
  SkeletonRow: () => null,
}));
vi.mock('@/ui/tour-target', () => ({ TourTarget: ({ children }: React.PropsWithChildren) => children }));

import BudgetForm from '@/app/(app)/budget-form';
import BudgetsScreen from '@/app/(app)/budgets';
import BudgetDetail from '@/app/(app)/budget-detail';
import { budgetOverview, groupBudgets } from './budget-presentation';
import { lightPalette, setThemeColors } from '@/theme';

let trees: ReactTestRenderer[];
async function render(component: React.ReactElement) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(component);
  });
  trees.push(tree);
  return tree;
}
const nodes = (tree: ReactTestRenderer, type: string) =>
  tree.root.findAll((node) => (node.type as unknown) === type);
async function press(tree: ReactTestRenderer, label: string) {
  const node = tree.root.findAll(
    (item) =>
      typeof item.props.onPress === 'function' &&
      (item.props.accessibilityLabel === label ||
        item.props.label === label ||
        (Array.isArray(item.props.children) ? item.props.children.join('') : item.props.children) === label),
  )[0];
  expect(node, label).toBeDefined();
  await act(async () => node!.props.onPress());
}
const copy = (tree: ReactTestRenderer) =>
  nodes(tree, 'Text')
    .map((node) =>
      Array.isArray(node.props.children) ? node.props.children.join('') : String(node.props.children ?? ''),
    )
    .join(' ');
async function choose(tree: ReactTestRenderer, label: string, id: number) {
  await press(tree, label);
  const selector = nodes(tree, 'Selector').find((node) => node.props.visible)!;
  await act(async () => {
    selector.props.onSelect(id);
    selector.props.onClose();
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  setThemeColors(lightPalette);
  trees = [];
  mocks.params = { year: '2026', month: '10' };
  mocks.hidden = false;
  mocks.budgets = [];
  mocks.categories = [
    { id: 1, name: 'Alimentación', type: 'EXPENSE', active: true },
    {
      id: 2,
      name: 'Desayunos',
      type: 'EXPENSE',
      active: true,
      parentCategoryId: 1,
      parentCategoryName: 'Alimentación',
    },
    {
      id: 3,
      name: 'Almuerzos',
      type: 'EXPENSE',
      active: true,
      parentCategoryId: 1,
      parentCategoryName: 'Alimentación',
    },
    { id: 4, name: 'Transporte', type: 'EXPENSE', active: true },
    {
      id: 5,
      name: 'Gasolina',
      type: 'EXPENSE',
      active: true,
      parentCategoryId: 4,
      parentCategoryName: 'Transporte',
    },
  ];
});
afterEach(async () => {
  await act(async () => trees.forEach((tree) => tree.unmount()));
  setThemeColors(lightPalette);
  vi.unstubAllGlobals();
});

describe('explicit category hierarchy in budget creation', () => {
  it('asks for a parent first and only shows its own children before submitting the child identity', async () => {
    const tree = await render(<BudgetForm />);
    expect(nodes(tree, 'SelectField').map((node) => node.props.label)).toEqual(['Categoría padre']);
    await press(tree, 'Categoría padre');
    expect(nodes(tree, 'Selector')[0]!.props.options.map((item: { id: number }) => item.id)).toEqual([1, 4]);
    await choose(tree, 'Categoría padre', 1);
    await press(tree, 'Subcategoría');
    expect(nodes(tree, 'Selector')[0]!.props.options.map((item: { id: number }) => item.id)).toEqual([2, 3]);
    await choose(tree, 'Subcategoría', 2);
    await act(async () => nodes(tree, 'MoneyInput')[0]!.props.onChangeText('100000'));
    await press(tree, 'Crear presupuesto');
    expect(mocks.create).toHaveBeenCalledWith(
      { categoryId: 2, year: 2026, month: 10, limitAmount: 100000 },
      expect.any(Object),
    );
  });
  it('makes a group ceiling an explicit choice and clears the child when the parent changes', async () => {
    const tree = await render(<BudgetForm />);
    await choose(tree, 'Categoría padre', 1);
    await choose(tree, 'Subcategoría', 2);
    await choose(tree, 'Categoría padre', 4);
    expect(
      nodes(tree, 'SelectField').find((node) => node.props.label === 'Subcategoría')!.props.value,
    ).toBeUndefined();
    await press(tree, 'Todo el grupo');
    expect(copy(tree)).toContain('no se suman encima');
    await act(async () => nodes(tree, 'MoneyInput')[0]!.props.onChangeText('500000'));
    await press(tree, 'Crear presupuesto');
    expect(mocks.create.mock.calls[0]![0].categoryId).toBe(4);
  });
  it('locks new subcategories inside the selected parent and creates roots separately', async () => {
    const tree = await render(<BudgetForm />);
    await press(tree, '+ Crear categoría padre');
    expect(nodes(tree, 'QuickCategoryModal')[0]!.props).toMatchObject({ visible: true, rootOnly: true });
    await act(async () => nodes(tree, 'QuickCategoryModal')[0]!.props.onClose());
    await choose(tree, 'Categoría padre', 1);
    await press(tree, '+ Crear subcategoría en Alimentación');
    expect(nodes(tree, 'QuickCategoryModal')[0]!.props).toMatchObject({
      visible: true,
      lockedParentCategoryId: 1,
      rootOnly: false,
    });
  });
  it('reuses an existing monthly budget instead of permitting a duplicate creation', async () => {
    mocks.budgets = [{ id: 22, categoryId: 2, categoryName: 'Desayunos', limitAmount: 100000 }];
    const tree = await render(<BudgetForm />);
    await choose(tree, 'Categoría padre', 1);
    await choose(tree, 'Subcategoría', 2);
    expect(copy(tree)).toContain('Este presupuesto ya existe');
    expect(
      nodes(tree, 'Button').find((node) => node.props.children === 'Crear presupuesto')!.props.disabled,
    ).toBe(true);
    await press(tree, 'Ver presupuesto existente');
    expect(mocks.replace).toHaveBeenCalledWith({
      pathname: '/(app)/budget-detail',
      params: { id: '22', year: '2026', month: '10' },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('keeps an inactive historical child and parent readable while editing its limit', async () => {
    mocks.categories = [];
    mocks.params = {
      id: '22',
      categoryId: '2',
      categoryName: 'Desayunos',
      parentCategoryId: '1',
      parentCategoryName: 'Alimentación',
      version: '3',
      limit: '100000',
      year: '2026',
      month: '10',
    };
    const tree = await render(<BudgetForm />);
    expect(nodes(tree, 'SelectField').map((node) => [node.props.value, node.props.disabled])).toEqual([
      ['Alimentación', true],
      ['Desayunos', true],
    ]);
    await press(tree, 'Guardar cambios');
    expect(mocks.update).toHaveBeenCalledWith(
      { id: 22, data: { limitAmount: 100000, version: 3 } },
      expect.any(Object),
    );
  });
  it('updates selector surfaces and icon containers when the app theme changes', async () => {
    const tree = await render(<BudgetForm />);
    await choose(tree, 'Categoría padre', 1);
    const choices = () => nodes(tree, 'Pressable').filter((node) => node.props.accessibilityRole === 'radio');
    const lightBackground = choices()[1]!.props.style[0].backgroundColor;
    setThemeColors({ ...lightPalette, background: '#09191E', primarySoft: '#173D3B', primary: '#79E6C6' });
    await act(async () => tree.update(<BudgetForm />));
    expect(choices()[1]!.props.style[0].backgroundColor).toBe('#09191E');
    expect(choices()[1]!.props.style[0].backgroundColor).not.toBe(lightBackground);
  });
});

describe('grouped budget summaries and details', () => {
  const budgets: Budget[] = [
    {
      id: 10,
      categoryId: 1,
      categoryName: 'Alimentación',
      limitAmount: 500000,
      spentAmount: 80000,
      remainingAmount: 420000,
      percentageUsed: 16,
    },
    {
      id: 11,
      categoryId: 2,
      categoryName: 'Desayunos',
      parentCategoryId: 1,
      parentCategoryName: 'Alimentación',
      limitAmount: 100000,
      spentAmount: 80000,
      remainingAmount: 20000,
      percentageUsed: 80,
    },
    {
      id: 12,
      categoryId: 3,
      categoryName: 'Almuerzos',
      parentCategoryId: 1,
      parentCategoryName: 'Alimentación',
      limitAmount: 250000,
      spentAmount: 0,
      remainingAmount: 250000,
      percentageUsed: 0,
    },
  ];
  it('counts the parent ceiling once and falls back to individual limits without a ceiling', () => {
    expect(groupBudgets(budgets)[0]).toMatchObject({
      name: 'Alimentación',
      limit: 500000,
      spent: 80000,
      remaining: 420000,
    });
    expect(groupBudgets(budgets.slice(1))[0]).toMatchObject({ limit: 350000, spent: 80000 });
    expect(budgetOverview(budgets).limit).toBe(500000);
  });
  it('starts with parent summaries and shows child limits only when expanded or Detailed is selected', async () => {
    mocks.budgets = budgets;
    const tree = await render(<BudgetsScreen />);
    expect(copy(tree)).toContain('Techo general');
    expect(
      nodes(tree, 'Pressable').some(
        (node) => node.props.accessibilityLabel === 'Ver presupuesto de Desayunos',
      ),
    ).toBe(false);
    await press(tree, 'Detalle de presupuestos');
    expect(
      nodes(tree, 'Pressable').some(
        (node) => node.props.accessibilityLabel === 'Ver presupuesto de Desayunos',
      ),
    ).toBe(true);
    await press(tree, 'Contraer presupuesto de Alimentación');
    expect(
      nodes(tree, 'Pressable').some(
        (node) => node.props.accessibilityLabel === 'Ver presupuesto de Desayunos',
      ),
    ).toBe(false);
  });
  it('keeps monetary values and usage charts private in a budget detail', async () => {
    mocks.hidden = true;
    mocks.params = { id: '11', year: '2026', month: '10' };
    mocks.budgets = budgets;
    const tree = await render(<BudgetDetail />);
    expect(nodes(tree, 'Progress')).toHaveLength(0);
    expect(copy(tree)).not.toContain('80%');
    expect(copy(tree)).toContain('Categoría padre');
  });
});
