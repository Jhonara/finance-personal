import * as SecureStore from 'expo-secure-store';

export const captureQaEnabled =
  (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_CAPTURE_QA === 'true';

export type CaptureDiagnosticSource = 'NOTIFICATION' | 'SHARED_TEXT' | 'IMAGE' | 'PDF' | 'NOTICE';
export type CaptureDiagnosticOutcome = 'ACCEPTED' | 'IGNORED' | 'DISCARDED' | 'FAILED';
export type CaptureDiagnosticReason =
  | 'SAVED_PENDING'
  | 'DUPLICATE_PENDING'
  | 'EMPTY_TEXT'
  | 'NO_MOVEMENT'
  | 'AUTH_MESSAGE'
  | 'USER_DISCARDED'
  | 'OFFLINE_OR_TIMEOUT'
  | 'SESSION_EXPIRED'
  | 'SERVER_REJECTED'
  | 'SESSION_CHANGED'
  | 'NOTICE_BLOCKED';
export type CaptureDiagnosticEvent = {
  at: string;
  source: CaptureDiagnosticSource;
  outcome: CaptureDiagnosticOutcome;
  reason: CaptureDiagnosticReason;
};
export type CaptureDiagnosticSnapshot = {
  lastSyncAt?: string;
  events: CaptureDiagnosticEvent[];
};

const sources = new Set<CaptureDiagnosticSource>(['NOTIFICATION', 'SHARED_TEXT', 'IMAGE', 'PDF', 'NOTICE']);
const outcomes = new Set<CaptureDiagnosticOutcome>(['ACCEPTED', 'IGNORED', 'DISCARDED', 'FAILED']);
const reasons = new Set<CaptureDiagnosticReason>([
  'SAVED_PENDING',
  'DUPLICATE_PENDING',
  'EMPTY_TEXT',
  'AUTH_MESSAGE',
  'NO_MOVEMENT',
  'USER_DISCARDED',
  'OFFLINE_OR_TIMEOUT',
  'SESSION_EXPIRED',
  'SERVER_REJECTED',
  'SESSION_CHANGED',
  'NOTICE_BLOCKED',
]);
const validEvent = (item: unknown): item is CaptureDiagnosticEvent => {
  if (!item || typeof item !== 'object') return false;
  const value = item as CaptureDiagnosticEvent;
  return (
    typeof value.at === 'string' &&
    Number.isFinite(Date.parse(value.at)) &&
    sources.has(value.source) &&
    outcomes.has(value.outcome) &&
    reasons.has(value.reason)
  );
};
export function captureDiagnosticSource(value: string | undefined): CaptureDiagnosticSource | null {
  return value && sources.has(value as CaptureDiagnosticSource) ? (value as CaptureDiagnosticSource) : null;
}

const empty = (): CaptureDiagnosticSnapshot => ({ events: [] });
const keyFor = (ownerId: string) => `finance.capture.diagnostics.v1.${ownerId}`;
const writes = new Map<string, Promise<void>>();
const validOwner = (ownerId: string) => /^\d+$/.test(ownerId);

async function read(ownerId: string): Promise<CaptureDiagnosticSnapshot> {
  if (!captureQaEnabled || !validOwner(ownerId)) return empty();
  try {
    const raw = await SecureStore.getItemAsync(keyFor(ownerId));
    if (!raw) return empty();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty();
    const value = parsed as CaptureDiagnosticSnapshot;
    return {
      lastSyncAt: typeof value.lastSyncAt === 'string' ? value.lastSyncAt : undefined,
      events: Array.isArray(value.events) ? value.events.filter(validEvent).slice(-30) : [],
    };
  } catch {
    return empty();
  }
}

function update(ownerId: string, change: (current: CaptureDiagnosticSnapshot) => CaptureDiagnosticSnapshot) {
  if (!captureQaEnabled || !validOwner(ownerId)) return Promise.resolve();
  const next = (writes.get(ownerId) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const current = await read(ownerId);
      const nextValue = change(current);
      if (nextValue !== current) await SecureStore.setItemAsync(keyFor(ownerId), JSON.stringify(nextValue));
    });
  writes.set(ownerId, next);
  void next
    .finally(() => {
      if (writes.get(ownerId) === next) writes.delete(ownerId);
    })
    .catch(() => undefined);
  return next;
}

/** Only fixed outcome codes enter storage; receipt text, names, amounts and errors never do. */
export function recordCaptureDiagnostic(
  ownerId: string,
  source: CaptureDiagnosticSource,
  outcome: CaptureDiagnosticOutcome,
  reason: CaptureDiagnosticReason,
) {
  if (!sources.has(source) || !outcomes.has(outcome) || !reasons.has(reason)) return Promise.resolve();
  return update(ownerId, (current) => ({
    ...current,
    events: [...current.events, { at: new Date().toISOString(), source, outcome, reason }].slice(-30),
  }));
}

export function markCaptureSynchronized(ownerId: string) {
  return update(ownerId, (current) =>
    current.lastSyncAt && Date.now() - Date.parse(current.lastSyncAt) < 60_000
      ? current
      : { ...current, lastSyncAt: new Date().toISOString() },
  );
}

export async function getCaptureDiagnostics(ownerId: string) {
  await writes.get(ownerId)?.catch(() => undefined);
  return read(ownerId);
}
