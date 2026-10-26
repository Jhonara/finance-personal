import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const stored = vi.hoisted(() => new Map<string, string>());
const access = vi.hoisted(() => ({
  state: 'authenticated',
  user: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => stored.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    stored.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    stored.delete(key);
  },
}));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View' }));
vi.mock('@/ui/primitives', () => ({ Button: 'Button', Screen: 'Screen' }));
vi.mock('@/ui/states', () => ({ EmptyState: 'EmptyState', SkeletonRow: 'SkeletonRow' }));
vi.mock('@/ui/movement-form', () => ({ MovementFormHeader: 'MovementFormHeader' }));
vi.mock('expo-router', () => ({ router: { canGoBack: () => true, back: vi.fn(), replace: vi.fn() } }));
vi.mock('@/theme/themed-styles', () => ({
  themedStyleSheet: (createStyles: () => unknown) => createStyles(),
}));
vi.mock('@/theme', () => ({
  colors: { text: '#000', textMuted: '#555' },
  spacing: { lg: 10, xl: 20 },
  typography: { screenTitle: {}, body: {} },
}));
vi.mock('@/auth/auth-provider', () => ({
  useAuth: () => ({ state: { status: access.state }, logout: access.logout }),
}));
vi.mock('@/features/profile/profile-api', () => ({ getCurrentUser: access.user }));

import { MovementDraftGate, useMovementDraft } from './use-movement-draft';
import { movementDraftKey } from './movement-draft-storage';

type Form = {
  amount: string;
  accountId?: number;
  categoryId?: number;
  expenseDate: string;
  description: string;
};
let tree: ReactTestRenderer | undefined;
let probe: ReturnType<typeof useMovementDraft<Form>>;
let currentForm: ReturnType<typeof useForm<Form>>;

function Probe({ userId }: { userId: number }) {
  currentForm = useForm<Form>({
    defaultValues: { amount: '', expenseDate: '2026-10-26', description: '' },
  });
  probe = useMovementDraft(currentForm, userId, 'expense', 'expenseDate', '2026-10-26');
  return <ViewForTest />;
}
function ViewForTest() {
  return null;
}
async function mount(userId: number) {
  await act(async () => {
    tree = create(<Probe userId={userId} />);
  });
}
async function unmount() {
  if (tree) await act(async () => tree?.unmount());
  tree = undefined;
}
beforeEach(() => {
  stored.clear();
  access.state = 'authenticated';
  access.user.mockReset();
  access.logout.mockReset();
  access.user.mockResolvedValue({ id: 1 });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(async () => {
  await unmount();
  vi.unstubAllGlobals();
});

it('recovers a real form after a process-like remount and offers an explicit choice', async () => {
  await mount(1);
  expect(probe.mode).toBe('editing');
  await act(async () => {
    currentForm.setValue('amount', '20000');
    currentForm.setValue('description', 'Almuerzo');
  });
  expect(JSON.parse(stored.get(movementDraftKey(1, 'expense'))!).amount).toBe('20000');
  await unmount();
  await mount(1);
  expect(probe.mode).toBe('choice');
  expect(currentForm.getValues('amount')).toBe('');
  await act(async () => probe.continueDraft());
  expect(probe.mode).toBe('editing');
  expect(currentForm.getValues('amount')).toBe('20000');
  expect(currentForm.getValues('description')).toBe('Almuerzo');
});

it('does not show another user draft and deletes only after explicit new or confirmation', async () => {
  await mount(1);
  await act(async () => currentForm.setValue('amount', '90000'));
  await unmount();
  await mount(2);
  expect(probe.mode).toBe('editing');
  expect(currentForm.getValues('amount')).toBe('');
  await unmount();
  await mount(1);
  expect(probe.mode).toBe('choice');
  expect(stored.has(movementDraftKey(1, 'expense'))).toBe(true);
  await act(async () => probe.createNew());
  expect(probe.mode).toBe('editing');
  expect(stored.has(movementDraftKey(1, 'expense'))).toBe(false);
  await act(async () => currentForm.setValue('amount', '30000'));
  await act(async () => probe.finish());
  expect(stored.has(movementDraftKey(1, 'expense'))).toBe(false);
});

it('verifies the owner before mounting a form and blocks expired or offline sessions', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const renderGate = () => (
    <QueryClientProvider client={client}>
      <MovementDraftGate kind="expense">{(userId) => <Marker userId={userId} />}</MovementDraftGate>
    </QueryClientProvider>
  );
  function Marker({ userId }: { userId: number }) {
    return <span>{userId}</span>;
  }
  await act(async () => {
    tree = create(renderGate());
  });
  await act(async () => {
    await vi.waitFor(() => expect(tree!.root.findAllByType('span')).toHaveLength(1));
  });
  expect(tree!.root.findByType('span').children).toEqual(['1']);
  await unmount();
  client.clear();
  access.user.mockRejectedValueOnce({ response: { status: 401 } });
  await act(async () => {
    tree = create(renderGate());
  });
  await act(async () => {
    await vi.waitFor(() => expect(access.logout).toHaveBeenCalledTimes(1));
  });
  expect(tree!.root.findAllByType('span')).toHaveLength(0);
  expect(access.logout).toHaveBeenCalledTimes(1);
  await unmount();
  client.clear();
  access.user.mockRejectedValueOnce(new Error('offline'));
  await act(async () => {
    tree = create(renderGate());
  });
  await act(async () => {
    await vi.waitFor(() =>
      expect(tree!.root.findAll((node) => (node.type as unknown) === 'EmptyState')).toHaveLength(1),
    );
  });
  expect(tree!.root.findAllByType('span')).toHaveLength(0);
  expect(access.logout).toHaveBeenCalledTimes(1);
  client.clear();
});
