import { z } from 'zod';

export const invocationSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{16,64}$/),
  ownerId: z.string().regex(/^[1-9]\d*$/),
  name: z.string(),
  params: z.record(z.string(), z.string()),
});
export type NativeInvocation = z.infer<typeof invocationSchema>;
export interface NativeIntentBridge {
  available: boolean;
  setOwner(owner: string | null): Promise<void>;
  pending(owner: string): Promise<NativeInvocation[]>;
  complete(owner: string, id: string): Promise<void>;
  listen(wake: () => void): { remove(): void };
}
