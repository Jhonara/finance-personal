import { describe, expect, it } from 'vitest';
import { financialErrorMessage, unavailableResource } from './form-errors';

describe('financial contextual errors', () => {
  it('maps network failures to the shared contextual feedback', () => {
    expect(financialErrorMessage({ message: 'Network Error' })).toBe(
      'No pudimos completar la operación. Revisa tu conexión e inténtalo nuevamente.',
    );
  });
  it('recognizes unavailable accounts and categories without treating them as generic errors', () => {
    expect(unavailableResource({ response: { status: 404, data: { message: 'Account not found' } } })).toBe(
      'account',
    );
    expect(
      unavailableResource({ response: { status: 404, data: { message: 'Categoría no encontrada' } } }),
    ).toBe('category');
  });
});
