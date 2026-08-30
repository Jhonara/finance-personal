import { useQuery } from '@tanstack/react-query';
import { getCategories } from './categories-api';
export const useCategories = (type: 'EXPENSE' | 'INCOME') => useQuery({ queryKey: ['categories', type, true], queryFn: () => getCategories(type) });
