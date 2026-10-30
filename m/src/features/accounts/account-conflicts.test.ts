import { describe, expect, it } from 'vitest';
import { accountConflict } from './account-conflicts';
describe('account conflicts', () => {
  it('distinguishes update and opening balance 409 without retrying', () => {
    const error = { response: { status: 409, data: { code: 'CONFLICT' } } };
    expect(accountConflict(error, 'update')).toBe('VERSION');
    expect(accountConflict(error, 'openingBalance')).toBe('OPENING_BALANCE');
  });
  it('keeps unrelated errors generic', () =>
    expect(accountConflict({ response: { status: 500, data: {} } }, 'update')).toBeNull());
});
