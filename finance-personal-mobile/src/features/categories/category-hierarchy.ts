import type { Category } from './categories-api';

export function categoryHierarchySelection(categories: Category[], value?: number) {
  const category = categories.find((item) => item.id === value);
  const parentId = category?.parentCategoryId ?? category?.id;
  const parent = categories.find((item) => item.id === parentId);
  return { category, parent, parentId, isSubcategory: category?.parentCategoryId != null };
}

export function categoryParents(categories: Category[], type: 'EXPENSE' | 'INCOME') {
  return categories.filter(
    (item) =>
      item.id != null &&
      item.parentCategoryId == null &&
      item.active !== false &&
      (!item.type || item.type === type),
  );
}

export function categoryChildren(
  categories: Category[],
  parentId: number | undefined,
  type: 'EXPENSE' | 'INCOME',
) {
  return parentId == null
    ? []
    : categories.filter(
        (item) =>
          item.id != null &&
          item.parentCategoryId === parentId &&
          item.active !== false &&
          (!item.type || item.type === type),
      );
}
