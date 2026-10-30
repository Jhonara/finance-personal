import * as SecureStore from 'expo-secure-store';

export type MovementDraftKind = 'expense' | 'income';
export type MovementDraftValues = {
  amount: string;
  accountId?: number;
  categoryId?: number;
  date: string;
  description: string;
};

const VERSION = 1;
const MAX_DESCRIPTION = 700;
const pending = new Map<string, Promise<void>>();
const generations = new Map<string, number>();

export const movementDraftKey = (userId: number, kind: MovementDraftKind) =>
  `finance-movement-draft-v1.${userId}.${kind}`;

export function isMovementDraftFilled(values: MovementDraftValues, initialDate: string) {
  return Boolean(
    values.amount.trim() ||
    values.accountId ||
    values.categoryId ||
    values.description.trim() ||
    values.date !== initialDate,
  );
}

function parseDraft(raw: string | null): MovementDraftValues | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw new Error('Borrador ilegible.');
    const record = value as Record<string, unknown>;
    if (
      record.version !== VERSION ||
      typeof record.amount !== 'string' ||
      typeof record.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
      typeof record.description !== 'string' ||
      record.description.length > MAX_DESCRIPTION
    )
      throw new Error('Borrador ilegible.');
    const id = (key: string) => {
      const number = record[key];
      return Number.isSafeInteger(number) && Number(number) > 0 ? Number(number) : undefined;
    };
    if (record.amount.length > 64) throw new Error('Borrador ilegible.');
    return {
      amount: record.amount,
      accountId: id('accountId'),
      categoryId: id('categoryId'),
      date: record.date,
      description: record.description,
    };
  } catch {
    throw new Error('Borrador ilegible.');
  }
}

function serializeDraft(values: MovementDraftValues) {
  if (values.description.length > MAX_DESCRIPTION || values.amount.length > 64)
    throw new Error('El texto es demasiado largo para guardarlo como borrador.');
  return JSON.stringify({ version: VERSION, ...values });
}

function enqueue(key: string, operation: () => Promise<void>) {
  const next = (pending.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
  pending.set(key, next);
  void next
    .finally(() => {
      if (pending.get(key) === next) pending.delete(key);
    })
    .catch(() => undefined);
  return next;
}

/** A new route invalidates writes from an older, still-unmounting form of the same owner and kind. */
export function createMovementDraftSession(userId: number, kind: MovementDraftKind) {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Usuario no verificado.');
  const key = movementDraftKey(userId, kind);
  const generation = (generations.get(key) ?? 0) + 1;
  generations.set(key, generation);
  let stopped = false;
  const current = () => generations.get(key) === generation;
  return {
    async load() {
      await pending.get(key)?.catch(() => undefined);
      if (!current() || stopped) return null;
      return parseDraft(await SecureStore.getItemAsync(key));
    },
    save(values: MovementDraftValues) {
      return enqueue(key, async () => {
        if (!current() || stopped) return;
        await SecureStore.setItemAsync(key, serializeDraft(values));
      });
    },
    clear() {
      return enqueue(key, async () => {
        if (!current()) return;
        await SecureStore.deleteItemAsync(key);
      });
    },
    /** Stop all future writes, then remove exactly this user's draft of this kind. */
    finish() {
      stopped = true;
      return this.clear();
    },
  };
}
