import { describe, expect, it } from 'vitest';
import { isInsufficientBalanceError } from '@/features/transactions/transfer-errors';
describe('transfer insufficient balance', () => {
  it('maps the backend insufficient-balance error to the contextual feedback condition', () => {
    expect(
      isInsufficientBalanceError({
        response: { status: 400, data: { code: 'INSUFFICIENT_BALANCE', message: 'technical' } },
      }),
    ).toBe(true);
  });
});
