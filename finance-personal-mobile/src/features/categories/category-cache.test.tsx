import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('@/auth/auth-provider', () => ({ api }));
import { useUpdateCategory } from './use-categories';

let client: QueryClient;
let tree: ReturnType<typeof create> | undefined;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  api.patch.mockResolvedValue({ data: { id: 2, name: 'Almuerzos', parentCategoryId: 3, version: 1 } });
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  client.clear();
});

describe('Category report navigation freshness', () => {
  it.each([
    { action: 'moving a child', data: { parentCategoryId: 3, version: 0 } },
    { action: 'renaming a category', data: { name: 'Almuerzos nuevos', version: 0 } },
  ])('refreshes retained parent and child movement lists after $action', async ({ data }) => {
    const period = { year: 2026, month: 10 };
    const keys = [
      ['reports', 'categories', 2026, 10, 'COP', 'expenses'],
      ['transactions', 'report-expenses', period, 'COP', 'Padre anterior', '1', 'EXPENSE'],
      ['transactions', 'report-expenses', period, 'COP', 'Padre nuevo', '3', 'EXPENSE'],
      ['transactions', 'report-expenses', period, 'COP', 'Almuerzos', '2', 'EXPENSE'],
      ['transactions', { year: 2026, month: 10 }],
    ];
    keys.forEach((key) => client.setQueryData(key, { previous: true }));
    let update!: ReturnType<typeof useUpdateCategory>;
    function Hook() {
      update = useUpdateCategory();
      return null;
    }
    await act(async () => {
      tree = create(
        <QueryClientProvider client={client}>
          <Hook />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await update.mutateAsync({ id: 2, data });
    });
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true);
  });
});
