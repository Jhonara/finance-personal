import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError, toApiError } from '@/api/errors';

export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): ApiError {
  const apiError = toApiError(error);
  Object.entries(apiError.fieldErrors).forEach(([field, message]) => {
    setError(field as Path<T>, { type: 'server', message });
  });
  return apiError;
}

export function friendlyAuthError(error: ApiError): string {
  if (error.status === 429)
    return 'Has realizado varios intentos. Espera un momento antes de volver a intentarlo.';
  if (error.status === 401) return 'El correo o la contraseña no son correctos.';
  if (error.status === null) return 'No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.';
  return error.message;
}
