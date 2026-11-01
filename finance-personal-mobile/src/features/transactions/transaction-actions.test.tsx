import React from 'react';
import { act, create } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
const mocks = vi.hoisted(() => ({ get: vi.fn(), reverse: vi.fn() }));
vi.mock('./transactions-api', () => ({ getTransactionDetail: mocks.get, reverseTransaction: mocks.reverse }));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View' }));
vi.mock('@/theme', () => ({ typography: {} }));
vi.mock('@/ui/primitives', () => ({ Button: 'Button', Input: 'Input' }));
import { TransactionActions } from './transaction-actions';
let client: QueryClient;
let tree: ReturnType<typeof create>;
const navigate = vi.fn();
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  client = new QueryClient();
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  client.clear();
});
async function mount(transaction: Parameters<typeof TransactionActions>[0]['transaction']) {
  await act(async () => {
    tree = create(
      <QueryClientProvider client={client}>
        <TransactionActions transaction={transaction} onNavigate={navigate} />
      </QueryClientProvider>,
    );
  });
}
const button = (label: string) =>
  tree.root
    .findAll((node) => (node.type as unknown) === 'Button')
    .find((node) => node.props.children === label)!;
it('requires confirmation, rechecks server state, prevents double submit and refreshes reports', async () => {
  client.setQueryData(['reports', 'budget-vs-actual'], { total: 100 });
  mocks.get.mockResolvedValue({ id: 1, reversible: true });
  mocks.reverse.mockResolvedValue({ id: 2, reversalOfId: 1 });
  await mount({ id: 1, type: 'EXPENSE', reversible: true });
  await act(async () => button('Revertir movimiento').props.onPress());
  expect(mocks.reverse).not.toHaveBeenCalled();
  await act(async () =>
    tree.root.find((node) => (node.type as unknown) === 'Input').props.onChangeText(' Duplicado '),
  );
  await act(async () => {
    button('Confirmar y revertir').props.onPress();
    button('Confirmar y revertir').props.onPress();
  });
  expect(mocks.reverse).toHaveBeenCalledExactlyOnceWith(1, 'Duplicado');
  expect(navigate).toHaveBeenCalledWith({ id: 2, reversalOfId: 1 });
  expect(client.getQueryState(['reports', 'budget-vs-actual'])?.isInvalidated).toBe(true);
});
it('preserves the reason and displays a failed financial validation without retrying', async () => {
  mocks.get.mockResolvedValue({ id: 1, reversible: true });
  mocks.reverse.mockRejectedValue(new ApiError('Saldo insuficiente', 409, null, null, null, {}));
  await mount({ id: 1, type: 'INCOME', reversible: true });
  await act(async () => button('Revertir movimiento').props.onPress());
  await act(async () =>
    tree.root.find((node) => (node.type as unknown) === 'Input').props.onChangeText('Corrección'),
  );
  await act(async () => button('Confirmar y revertir').props.onPress());
  expect(mocks.reverse).toHaveBeenCalledOnce();
  expect(tree.root.find((node) => (node.type as unknown) === 'Input').props.value).toBe('Corrección');
  expect(JSON.stringify(tree.toJSON())).toContain('Saldo insuficiente');
});
it('navigates to an existing reversal when another device already corrected the original', async () => {
  mocks.get.mockResolvedValue({ id: 1, status: 'REVERSED', reversible: false, reversalId: 2 });
  await mount({ id: 1, reversible: true });
  await act(async () => button('Revertir movimiento').props.onPress());
  await act(async () => button('Confirmar y revertir').props.onPress());
  expect(mocks.reverse).not.toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ reversalId: 2 }));
});
it('shows a link to the original and no reverse action on a correction', async () => {
  mocks.get.mockResolvedValue({ id: 1, status: 'REVERSED' });
  await mount({ id: 2, type: 'REVERSAL', originalType: 'TRANSFER', reversalOfId: 1 });
  expect(button('Revertir movimiento')).toBeUndefined();
  await act(async () => button('Ver movimiento original').props.onPress());
  expect(mocks.get).toHaveBeenCalledWith(1);
});

it('does not render a reversal link for nullable JSON fields on a posted original', async () => {
  await mount({ id: 1, reversible: true, reversalOfId: null, reversalId: null } as unknown as Parameters<
    typeof TransactionActions
  >[0]['transaction']);
  expect(button('Ver reversión')).toBeUndefined();
  expect(button('Revertir movimiento')).toBeDefined();
});
