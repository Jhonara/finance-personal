import type { components } from '@/api/generated/schema';
import { api } from '@/auth/auth-provider';
export type Category = components['schemas']['CategoryResponse'];
export const getCategories = async (type: 'EXPENSE' | 'INCOME') => (await api.get<Category[]>('/categories', { params: { type, active: true } })).data;
