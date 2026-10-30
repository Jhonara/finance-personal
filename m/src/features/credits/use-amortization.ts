import { useMutation, useQuery } from '@tanstack/react-query';
import { secondaryKeys } from '@/features/secondary/use-secondary';
import { getCreditAmortization, simulateCreditAmortization } from './amortization-api';
import type { CreditAmortizationScenarioInput } from './amortization-api';

export const useCreditAmortization = (id: number) =>
  useQuery({
    queryKey: secondaryKeys.amortization(id),
    queryFn: () => getCreditAmortization(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    staleTime: 60_000,
  });

export const useAmortizationScenario = () =>
  useMutation({
    mutationFn: ({ id, ...data }: CreditAmortizationScenarioInput & { id: number }) =>
      simulateCreditAmortization(id, data),
    retry: false,
  });
