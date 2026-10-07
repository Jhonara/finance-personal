import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCategory, getCategories, updateCategory } from './categories-api';
export const categoryKeys = {
  all: ['categories'] as const,
  list: (type: 'EXPENSE' | 'INCOME', active: boolean | null = true) => ['categories', type, active] as const,
};
export const useCategories = (type: 'EXPENSE' | 'INCOME', active: boolean | null = true) =>
  useQuery({
    queryKey: categoryKeys.list(type, active),
    queryFn: () => getCategories(type, active === null ? undefined : active),
  });
export const useCreateCategory = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    retry: false,
    onSuccess: () => c.invalidateQueries({ queryKey: categoryKeys.all }),
  });
};
export const useUpdateCategory = () => {
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateCategory>[1] }) =>
      updateCategory(id, data),
    retry: false,
    onSuccess: () => c.invalidateQueries({ queryKey: categoryKeys.all }),
  });
};
