import { describe, expect, it } from 'vitest';

import { isAutomaticNetworkRetryAllowed } from './retry-policy';

describe('automatic network retry policy', () => {
  it('does not automatically retry POST mutations', () => {
    expect(isAutomaticNetworkRetryAllowed('post')).toBe(false);
    expect(isAutomaticNetworkRetryAllowed('get')).toBe(true);
  });
});
