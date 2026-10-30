import { describe, expect, it, vi } from 'vitest';

import { applyApiFieldErrors, friendlyAuthError } from './form-errors';
import { loginSchema, registerSchema } from './auth-schemas';

describe('auth forms', () => {
  it('accepts a valid login and rejects invalid local input', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'secret' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'incorrecto', password: '' }).success).toBe(false);
  });

  it('requires the backend-compatible registration fields', () => {
    expect(
      registerSchema.safeParse({
        name: 'Ana',
        email: 'ana@example.com',
        confirmEmail: 'ana@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      }).success,
    ).toBe(true);
    expect(
      registerSchema.safeParse({
        name: '',
        email: 'ana@example.com',
        confirmEmail: 'otra@example.com',
        password: '123',
        confirmPassword: 'otra',
      }).success,
    ).toBe(false);
  });

  it('maps backend field errors to the form and presents rate limits safely', () => {
    const setError = vi.fn();
    applyApiFieldErrors(
      {
        response: {
          status: 400,
          data: { message: 'Datos inválidos', fieldErrors: { email: 'Correo inválido' } },
        },
      },
      setError,
    );
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Correo inválido' });
    expect(friendlyAuthError({ status: 429 } as never)).toContain('Espera un momento');
  });
});
