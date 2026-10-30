import type { components } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';
export type Category = components['schemas']['CategoryResponse'];
export const getCategories = async (type: 'EXPENSE' | 'INCOME', active?: boolean) =>
  (await api.get<Category[]>('/categories', { params: { type, active } })).data;
export const createCategory = async (data: components['schemas']['CreateCategoryRequest']) =>
  (await api.post<Category>('/categories', data)).data;
export const getCategory = async (id: number) => (await api.get<Category>(`/categories/${id}`)).data;
export const updateCategory = async (id: number, data: components['schemas']['UpdateCategoryRequest']) =>
  (await api.patch<Category>(`/categories/${id}`, data)).data;
