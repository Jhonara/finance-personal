import type { QueryClient } from '@tanstack/react-query';

import { currentUserKeys } from './profile-keys';

export function removeCurrentUserCache(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: currentUserKeys.all });
}
