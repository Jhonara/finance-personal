import { z } from 'zod';
import type { components } from '@/api/generated/schema';
import type { NativeInvocation, NativeIntentBridge } from './native-types';

type Intake = components['schemas']['NativePurchaseIntake'];
type Receipt = components['schemas']['PurchaseDraftResponse'];
const paramsSchema = z
  .object({
    amount: z
      .string()
      .regex(/^\d{1,12}(?:\.\d{1,4})?$/)
      .refine((value) => Number(value) > 0)
      .optional(),
    merchant: z.string().max(120).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
    cardReference: z.string().max(80).optional(),
    eventReference: z.string().min(1).max(120).optional(),
  })
  .strict();

export function nativePurchaseInput(invocation: NativeInvocation, owner: string): Intake {
  if (invocation.ownerId !== owner) throw new Error('La acción pertenece a otro usuario.');
  if (!['registerExpense', 'importWallet'].includes(invocation.name))
    throw new Error('Acción no compatible.');
  const params = paramsSchema.parse(invocation.params);
  if (
    invocation.name === 'registerExpense' &&
    (!params.amount || !params.merchant?.trim() || !params.currency)
  )
    throw new Error('Completa el importe, el concepto y la moneda en la acción.');
  return {
    ownerId: Number(owner),
    invocationId: invocation.id,
    action: invocation.name,
    ...params,
    amount: params.amount ? Number(params.amount) : undefined,
  };
}

/** Acknowledgement is strictly after a durable server receipt, never in finally. */
export async function processNativePurchase(
  invocation: NativeInvocation,
  owner: string,
  deps: {
    commit(input: Intake): Promise<Receipt>;
    bridge: Pick<NativeIntentBridge, 'complete'>;
    isCurrent(): boolean;
  },
): Promise<Receipt | undefined> {
  const input = nativePurchaseInput(invocation, owner);
  if (!deps.isCurrent()) return;
  const receipt = await deps.commit(input);
  if (!receipt.id || !['PENDING', 'POSTED', 'LINKED', 'DISCARDED'].includes(receipt.status ?? ''))
    throw new Error('No se pudo comprobar que la compra esté guardada.');
  if (!deps.isCurrent()) return;
  await deps.bridge.complete(owner, invocation.id);
  return receipt;
}
