import { useQuery } from '@tanstack/react-query';
import { api } from '@/auth/auth-provider';
import type { components } from '@/api/generated/schema';
export type WalletCard = components['schemas']['WalletCardResponse'];
export type WalletCardInput = components['schemas']['WalletCardInput'];
export const walletCardsKey = ['wallet-cards'] as const;
export const useWalletCards = () =>
  useQuery({
    queryKey: walletCardsKey,
    queryFn: async () => (await api.get<WalletCard[]>('/inbox/cards')).data,
    retry: false,
  });
