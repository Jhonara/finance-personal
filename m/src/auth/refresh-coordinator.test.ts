import { describe, expect, it } from 'vitest';

import { RefreshCoordinator } from './refresh-coordinator';

describe('RefreshCoordinator', () => {
  it('shares a single in-flight refresh', async () => {
    const coordinator = new RefreshCoordinator();
    let calls = 0;
    let release: ((value: string | null) => void) | undefined;
    const pending = new Promise<string | null>((resolve) => {
      release = resolve;
    });
    const refresh = () => {
      calls += 1;
      return pending;
    };

    const results = await Promise.all(
      [coordinator.run(refresh), coordinator.run(refresh), coordinator.run(refresh)].map(async (result) => {
        release?.('renewed-access');
        return result;
      }),
    );

    expect(calls).toBe(1);
    expect(results).toEqual(['renewed-access', 'renewed-access', 'renewed-access']);
  });
});
