import { useQuery } from '@tanstack/react-query';
import { getAccounts } from './accounts-api';
export const accountKeys = { all: ['accounts'] as const, list: () => [...accountKeys.all, 'list'] as const };
export const useAccounts = () =>
  useQuery({ queryKey: accountKeys.list(), queryFn: getAccounts, staleTime: 60_000 });
