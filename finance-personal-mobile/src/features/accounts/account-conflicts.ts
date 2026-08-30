import { toApiError } from '@/api/errors';

export type AccountConflict = 'VERSION' | 'OPENING_BALANCE' | null;
export function accountConflict(error: unknown, operation: 'update' | 'openingBalance'): AccountConflict {
  return toApiError(error).status === 409 ? (operation === 'update' ? 'VERSION' : 'OPENING_BALANCE') : null;
}
