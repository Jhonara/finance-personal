import { useQuery } from '@tanstack/react-query';

import { getCurrentUser, type CurrentUser } from './profile-api';
import { currentUserKeys } from './profile-keys';

export function useCurrentUser() {
  return useQuery<CurrentUser>({
    queryKey: currentUserKeys.current(),
    queryFn: getCurrentUser,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
