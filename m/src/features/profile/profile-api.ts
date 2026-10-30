import { api } from '@/auth/auth-provider';
import type { components } from '@/api/generated/schema';

export type CurrentUser = components['schemas']['CurrentUserResponse'];

export async function getCurrentUser(): Promise<CurrentUser> {
  return (await api.get<CurrentUser>('/me')).data;
}
