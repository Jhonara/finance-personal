import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/auth/auth-provider', () => ({ api }));
import { refreshCredit, useCreateBudget, useUpdateBudget, useChangeBudgetState } from './use-secondary';

let client: QueryClient;
let tree: ReturnType<typeof create> | undefined;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  api.post.mockResolvedValue({ data: { id: 7, categoryId: 1, limitAmount: 500 } });
  api.patch.mockResolvedValue({ data: { id: 7, categoryId: 1, limitAmount: 700 } });
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  client.clear();
});

describe('Financial report cache freshness', () => {
  it.each(['create', 'update'] as const)(
    'refreshes budget comparisons immediately after budget %s',
    async (operation) => {
      const reportKey = ['reports', 'budget-vs-actual', 2026, 10];
      client.setQueryData(reportKey, { totalBudgetedAmount: 300 });
      let actions!: {
        create: ReturnType<typeof useCreateBudget>;
        update: ReturnType<typeof useUpdateBudget>;
      };
      function Hooks() {
        actions = { create: useCreateBudget(), update: useUpdateBudget() };
        return null;
      }
      await act(async () => {
        tree = create(
          <QueryClientProvider client={client}>
            <Hooks />
          </QueryClientProvider>,
        );
      });
      await act(async () => {
        if (operation === 'create')
          await actions.create.mutateAsync({ categoryId: 1, year: 2026, month: 10, limitAmount: 500 });
        else await actions.update.mutateAsync({ id: 7, data: { limitAmount: 700, version: 0 } });
      });
      expect(client.getQueryState(reportKey)?.isInvalidated).toBe(true);
    },
  );
  it.each([false, true])('refreshes active and archived plans after changing active=%s', async (active) => {
    const keys = [
      ['budgets', 2026, 10],
      ['budgets', 2026, 10, 'all'],
      ['reports', 'budget-vs-actual'],
      ['alerts'],
    ];
    keys.forEach((key) => client.setQueryData(key, { previous: true }));
    let action!: ReturnType<typeof useChangeBudgetState>;
    function Hook() {
      action = useChangeBudgetState();
      return null;
    }
    await act(async () => {
      tree = create(
        <QueryClientProvider client={client}>
          <Hook />
        </QueryClientProvider>,
      );
    });
    await act(async () => action.mutateAsync({ id: 7, version: 1, active }));
    expect(action.isError).toBe(false);
    expect(action.mutate).toBeDefined();
    if (active) expect(api.patch).toHaveBeenCalledWith('/budgets/7/state', { active: true, version: 1 });
    else expect(api.delete).toHaveBeenCalledWith('/budgets/7', { params: { version: 1 } });
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
  it('refreshes monthly, parent, child and budget reports after credit payment or reversal', async () => {
    const keys = [
      ['reports', 'month', 2026, 10],
      ['reports', 'categories', 2026, 10, 'COP', 'expenses'],
      ['reports', 'budget-vs-actual', 2026, 10],
      ['budgets', 2026, 10],
      ['transactions', 'report-expenses', { year: 2026, month: 10 }, 'COP', 'Intereses', '4', 'EXPENSE'],
    ];
    keys.forEach((key) => client.setQueryData(key, { previous: true }));
    await refreshCredit(client, 3);
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated, JSON.stringify(key)).toBe(true);
  });
});
