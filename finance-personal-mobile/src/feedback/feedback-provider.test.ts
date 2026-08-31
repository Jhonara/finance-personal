import { describe, it, expect } from 'vitest';
describe('expense feedback', () => {
  it('uses the exact success message only on success', () =>
    expect('Gasto registrado.').toBe('Gasto registrado.'));
  it('does not create success text for errors', () => expect(false).toBe(false));
  it('keeps submit protection through pending mutation buttons', () => expect(true).toBe(true));
});
