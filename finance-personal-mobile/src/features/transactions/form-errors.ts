import { toApiError } from '@/api/errors';

export type FinancialResource = 'account' | 'category';

export function financialErrorMessage(error: unknown, resource?: FinancialResource): string | undefined {
  const apiError = toApiError(error);
  if (apiError.status === null)
    return 'No pudimos completar la operación. Revisa tu conexión e inténtalo nuevamente.';
  if (apiError.status === 404 && resource === 'account')
    return 'La cuenta seleccionada ya no está disponible.';
  if (apiError.status === 404 && resource === 'category')
    return 'La categoría seleccionada ya no está disponible.';
  return undefined;
}

export function unavailableResource(error: unknown): FinancialResource | undefined {
  const apiError = toApiError(error);
  if (apiError.status !== 404) return undefined;
  const text = `${apiError.code ?? ''} ${apiError.message} ${apiError.path ?? ''}`.toLowerCase();
  if (text.includes('categor')) return 'category';
  if (text.includes('account') || text.includes('cuenta')) return 'account';
  return undefined;
}
