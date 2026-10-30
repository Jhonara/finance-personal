import { api } from '@/auth/auth-provider';
import { getCurrentUser } from '@/features/profile/profile-api';
import type { Draft, DraftFields } from '@/features/inbox/inbox-api';
import type { AcceptedSharedText } from './shared-text-intake';
import { currentNoticeEpoch, notifyDetectedDraft } from './detected-notices';
import { recordCaptureDiagnostic, type CaptureDiagnosticSource } from './capture-diagnostics';
import { toApiError } from '@/api/errors';

export function detectedRequestKey(intake: AcceptedSharedText, occurrence = '') {
  const suffix = occurrence ? `-${occurrence}` : '';
  return `detected-${intake.identity.replace(/[^a-zA-Z0-9-]/g, '-')}${suffix}`.slice(0, 80);
}

export function detectedFields(intake: AcceptedSharedText): DraftFields {
  const values = intake.intake.values;
  return {
    kind: values.kind,
    description: values.description.trim() || 'Movimiento por revisar',
    amount:
      values.amount && Number.isFinite(Number(values.amount)) && Number(values.amount) > 0
        ? Number(values.amount)
        : undefined,
    currency: /^[A-Z]{3}$/.test(values.currency) ? values.currency : undefined,
    effectiveDate: values.effectiveDate || undefined,
  };
}

/** Saves only parsed fields. An uncertain network response is safe to retry with the same key and fields. */
export async function createDetectedDraft(
  intake: AcceptedSharedText,
  occurrence = '',
  expectedOwnerId?: string,
): Promise<Draft> {
  const epoch = currentNoticeEpoch();
  let ownerId: string | undefined;
  let changed = false;
  const source = intake.intake.source as CaptureDiagnosticSource;
  try {
    const before = await getCurrentUser();
    if (!before.id) throw new Error('No pudimos comprobar tu sesión.');
    ownerId = String(before.id);
    if ((expectedOwnerId && ownerId !== expectedOwnerId) || epoch !== currentNoticeEpoch()) {
      changed = true;
      throw new Error('La sesión cambió. Revisa tus movimientos detectados.');
    }
    const response = await api.post<Draft>('/inbox', {
      requestKey: detectedRequestKey(intake, occurrence),
      fields: detectedFields(intake),
      source: intake.intake.source,
    });
    const after = await getCurrentUser();
    if (after.id !== before.id) {
      changed = true;
      throw new Error('La sesión cambió. Revisa tus movimientos detectados.');
    }
    void recordCaptureDiagnostic(ownerId, source, 'ACCEPTED', 'SAVED_PENDING').catch(() => undefined);
    void notifyDetectedDraft(ownerId, response.data, epoch).catch(() => undefined);
    return response.data;
  } catch (error) {
    if (ownerId && (!expectedOwnerId || ownerId === expectedOwnerId)) {
      const status = toApiError(error).status;
      const reason = changed
        ? 'SESSION_CHANGED'
        : status === 401
          ? 'SESSION_EXPIRED'
          : !status
            ? 'OFFLINE_OR_TIMEOUT'
            : 'SERVER_REJECTED';
      void recordCaptureDiagnostic(ownerId, source, 'FAILED', reason).catch(() => undefined);
    }
    throw error;
  }
}
