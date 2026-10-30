import { toApiError } from '@/api/errors';
export function isInsufficientBalanceError(error: unknown): boolean {
  const apiError = toApiError(error);
  return (
    apiError.code === 'INSUFFICIENT_BALANCE' ||
    apiError.message.toLocaleLowerCase('es-CO').includes('saldo insuficiente')
  );
}
