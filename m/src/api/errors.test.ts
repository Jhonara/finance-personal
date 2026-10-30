import { describe, expect, it } from 'vitest';

import { toApiError } from './errors';

describe('toApiError', () => {
  it('preserves the backend error contract and field errors', () => {
    const error = toApiError({
      response: {
        status: 400,
        data: {
          timestamp: '2026-08-30T12:00:00Z',
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos',
          path: '/api/v1/auth/login',
          fieldErrors: { email: 'Formato inválido' },
        },
      },
    });
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Datos inválidos',
      fieldErrors: { email: 'Formato inválido' },
    });
  });
});
