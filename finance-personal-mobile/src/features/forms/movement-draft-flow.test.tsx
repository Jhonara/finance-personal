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
import { currentUserKeys } from '@/features/profile/profile-keys';

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

function VerifiedForm({ userId }: { userId: number }) {
  const [amount, setAmount] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  return React.createElement('VerifiedForm', { userId, amount, busy, setAmount, setBusy });
}
const verifiedForm = () => tree!.root.findAll((node) => (node.type as unknown) === 'VerifiedForm');
function gate(client: QueryClient) {
  return (
    <QueryClientProvider client={client}>
      <MovementDraftGate kind="expense">{(userId) => <VerifiedForm userId={userId} />}</MovementDraftGate>
    </QueryClientProvider>
  );
}

it('keeps the same verified form and submission guard during background refresh and a temporary connection failure', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    tree = create(gate(client));
  });
  await act(async () => {
    await vi.waitFor(() => expect(verifiedForm()).toHaveLength(1));
  });
  await act(async () => {
    verifiedForm()[0]!.props.setAmount('25000');
    verifiedForm()[0]!.props.setBusy(true);
  });
  let resolve!: (value: { id: number }) => void;
  access.user.mockReturnValueOnce(new Promise((done) => (resolve = done)));
  let refresh!: Promise<void>;
  await act(async () => {
    refresh = client.refetchQueries({ queryKey: currentUserKeys.current() });
    await vi.waitFor(() =>
      expect(client.getQueryState(currentUserKeys.current())?.fetchStatus).toBe('fetching'),
    );
  });
  expect(verifiedForm()[0]!.props).toMatchObject({ userId: 1, amount: '25000', busy: true });
  await act(async () => {
    resolve({ id: 1 });
    await refresh;
  });
  access.user.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => client.refetchQueries({ queryKey: currentUserKeys.current() }));
  expect(verifiedForm()[0]!.props).toMatchObject({ userId: 1, amount: '25000', busy: true });
  await unmount();
  client.clear();
});

it('waits for initial verification even with a cached profile, isolates a changed owner and blocks a rejected session', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(currentUserKeys.current(), { id: 1 });
  let resolve!: (value: { id: number }) => void;
  access.user.mockReturnValueOnce(new Promise((done) => (resolve = done)));
  await act(async () => {
    tree = create(gate(client));
  });
  expect(verifiedForm()).toHaveLength(0);
  await act(async () => resolve({ id: 1 }));
  await act(async () => {
    await vi.waitFor(() => expect(verifiedForm()).toHaveLength(1));
  });
  await act(async () => verifiedForm()[0]!.props.setAmount('90000'));
  await act(async () => {
    client.setQueryData(currentUserKeys.current(), { id: 2 });
    await vi.waitFor(() => expect(verifiedForm()[0]!.props.userId).toBe(2));
  });
  expect(verifiedForm()[0]!.props.amount).toBe('');
  access.user.mockRejectedValueOnce({ response: { status: 401 } });
  await act(async () => {
    await client.refetchQueries({ queryKey: currentUserKeys.current() });
    await vi.waitFor(() => expect(verifiedForm()).toHaveLength(0));
  });
  expect(access.logout).toHaveBeenCalledOnce();
  await unmount();
  client.clear();
});
