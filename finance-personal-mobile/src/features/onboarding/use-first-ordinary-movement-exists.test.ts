import { describe, expect, it } from 'vitest';
import { hasHistoricalOrdinaryMovement } from './first-ordinary-movement';

describe('historical first movement detection', () => {
  it('completes only when an ordinary type has a historical match', () => {
    expect(hasHistoricalOrdinaryMovement([false, false, false])).toBe(false);
    expect(hasHistoricalOrdinaryMovement([false, true, undefined])).toBe(true);
  });
});
