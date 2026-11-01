import { api } from '@/auth/auth-provider';
import type { components } from '@/api/generated/schema';

export type CurrentUser = components['schemas']['CurrentUserResponse'];

export async function getCurrentUser(): Promise<CurrentUser> {
  return (await api.get<CurrentUser>('/me')).data;
}
export type ProfileUpdate = components['schemas']['UpdateProfileRequest'];
export async function updateCurrentUser(input: ProfileUpdate): Promise<CurrentUser> {
  return (await api.put<CurrentUser>('/me', input)).data;
}
