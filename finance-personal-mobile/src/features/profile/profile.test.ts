import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());

vi.mock('@/auth/auth-provider', () => ({ api: { get } }));

import { getCurrentUser } from './profile-api';
import { removeCurrentUserCache } from './profile-cache';
import { currentUserKeys } from './profile-keys';

describe('current user profile', () => {
  it('gets the safe current-user contract through the authenticated API client', async () => {
    const user = { id: 7, name: 'Jhonatan', email: 'jhonatan@finance.com' };
    get.mockResolvedValueOnce({ data: user });

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(get).toHaveBeenCalledWith('/me');
  });

  it('uses a stable cache key', () => {
    expect(currentUserKeys.current()).toEqual(['current-user']);
    expect(currentUserKeys.current()).toEqual(currentUserKeys.current());
  });

  it('removes the previous profile on session cleanup', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(currentUserKeys.current(), { id: 1, name: 'Previous user', email: 'old@finance.com' });

    removeCurrentUserCache(queryClient);

    expect(queryClient.getQueryData(currentUserKeys.current())).toBeUndefined();
  });
});
