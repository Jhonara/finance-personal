import type { components } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';
type ApiCategory = components['schemas']['CategoryResponse'];
export type Category = ApiCategory & { parentCategoryId?: number | null; parentCategoryName?: string | null };
export type CreateCategoryData = components['schemas']['CreateCategoryRequest'] & {
  parentCategoryId?: number;
};
export type UpdateCategoryData = components['schemas']['UpdateCategoryRequest'] & {
  parentCategoryId?: number;
  clearParent?: boolean;
};
export const categoryLabel = (category: Category | undefined) =>
  category?.name
    ? category.parentCategoryName
      ? `${category.parentCategoryName} › ${category.name}`
      : category.name
    : undefined;
export const getCategories = async (type: 'EXPENSE' | 'INCOME', active?: boolean) =>
  (await api.get<Category[]>('/categories', { params: { type, active } })).data;
export const createCategory = async (data: CreateCategoryData) =>
  (await api.post<Category>('/categories', data)).data;
export const getCategory = async (id: number) => (await api.get<Category>(`/categories/${id}`)).data;
export const updateCategory = async (id: number, data: UpdateCategoryData) =>
  (await api.patch<Category>(`/categories/${id}`, data)).data;
