import { describe, expect, it } from 'vitest';
import { financialErrorMessage, unavailableResource } from './form-errors';

describe('financial contextual errors', () => {
  it('maps network failures to the shared contextual feedback', () => {
    expect(financialErrorMessage({ message: 'Network Error' })).toBe(
      'No pudimos confirmar la operación. Revisa tus movimientos antes de intentarlo de nuevo.',
    );
  });
  it('never leaves a rejected financial registration without feedback', () => {
    expect(financialErrorMessage({ response: { status: 409, data: {} } })).toBe(
      'No se registró el movimiento. Revisa tus movimientos antes de volver a intentarlo.',
    );
    expect(financialErrorMessage({ response: { status: 401, data: {} } })).toContain('sesión venció');
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
