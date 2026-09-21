import { useCallback, useRef, useState } from 'react';
import { ApiError, toApiError } from '@/api/errors';

export const creditFailure = (cause: unknown) => (cause instanceof ApiError ? cause : toApiError(cause));
export const alreadyReversed = (cause: unknown) => {
  const error = creditFailure(cause);
  return error.status === 409 && error.message === 'El pago ya fue revertido';
};
export const uncertainCopy =
  'No pudimos confirmar la operación. Revisa tus movimientos antes de intentarlo de nuevo.';
export function useCreditSubmit() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const reset = useCallback(() => {
    if (lock.current) return;
    setBusy(false);
    setUncertain(false);
    setError('');
  }, []);
  return {
    reset,
    busy,
    uncertain,
    error,
    setError,
    run: async (work: () => Promise<void>, onError: (error: ApiError) => void) => {
      if (lock.current || uncertain) return;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        await work();
      } catch (cause) {
        const failure = creditFailure(cause);
        const unknown = failure.status === null || failure.status >= 500;
        setUncertain(unknown);
        setError(
          unknown
            ? uncertainCopy
            : 'No pudimos completar la operación. Revisa los datos e inténtalo de nuevo.',
        );
        onError(failure);
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
  };
}
