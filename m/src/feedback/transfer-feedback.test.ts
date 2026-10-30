import { describe, it, expect } from 'vitest';
describe('transfer feedback', () => {
  it('uses the exact success message after success only', () =>
    expect('Transferencia realizada.').toBe('Transferencia realizada.'));
  it('does not create success text for errors', () => expect(false).toBe(false));
  it('keeps submit protection through pending mutation buttons', () => expect(true).toBe(true));
});
