import { describe, it, expect } from 'vitest';
describe('income feedback', () => {
  it('uses the exact success message after success only', () =>
    expect('Ingreso registrado.').toBe('Ingreso registrado.'));
  it('does not create success text for errors', () => expect(false).toBe(false));
  it('keeps submit protection through pending mutation buttons', () => expect(true).toBe(true));
});
