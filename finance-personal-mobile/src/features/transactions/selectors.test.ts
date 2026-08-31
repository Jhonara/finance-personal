import { describe, it, expect } from 'vitest';
const active = (x: { id: number; active: boolean; currency: string }[]) => x.filter((a) => a.active);
const destinations = (
  source: { id: number; currency: string },
  items: { id: number; active: boolean; currency: string }[],
) => active(items).filter((x) => x.id !== source.id && x.currency === source.currency);
describe('operation selectors', () => {
  it('excludes inactive accounts', () =>
    expect(
      active([
        { id: 1, active: true, currency: 'COP' },
        { id: 2, active: false, currency: 'COP' },
      ]),
    ).toHaveLength(1));
  it('filters transfer destination by origin and currency', () =>
    expect(
      destinations({ id: 1, currency: 'COP' }, [
        { id: 1, active: true, currency: 'COP' },
        { id: 2, active: true, currency: 'COP' },
        { id: 3, active: true, currency: 'USD' },
      ]).map((x) => x.id),
    ).toEqual([2]));
});
