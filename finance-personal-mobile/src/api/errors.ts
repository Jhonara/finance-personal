import type { AxiosError } from 'axios';

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null,
    readonly path: string | null,
    readonly timestamp: string | null,
    readonly fieldErrors: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type BackendErrorPayload = {
  message?: unknown;
  status?: unknown;
  code?: unknown;
  path?: unknown;
  timestamp?: unknown;
  fieldErrors?: unknown;
};

export function toApiError(error: unknown): ApiError {
  const axiosError = error as AxiosError<BackendErrorPayload>;
  const payload = axiosError.response?.data;
  const fieldErrors = payload?.fieldErrors;
  return new ApiError(
    typeof payload?.message === 'string' ? payload.message : 'No fue posible completar la solicitud.',
    typeof payload?.status === 'number' ? payload.status : (axiosError.response?.status ?? null),
    typeof payload?.code === 'string' ? payload.code : null,
    typeof payload?.path === 'string' ? payload.path : null,
    typeof payload?.timestamp === 'string' ? payload.timestamp : null,
    fieldErrors !== null && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)
      ? Object.fromEntries(
          Object.entries(fieldErrors).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {},
  );
}
