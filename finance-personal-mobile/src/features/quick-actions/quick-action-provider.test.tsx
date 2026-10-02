import React from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accounts: [] as Array<{ active: boolean; currency: string }>,
  isError: false,
  refetch: vi.fn(),
  show: vi.fn(),
  openForm: vi.fn(),
  mark: vi.fn(),
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: object) => styles },
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
  Text: ({ children, ...props }: React.PropsWithChildren<object>) =>
    React.createElement('Text', props, children),
  View: ({ children, ...props }: React.PropsWithChildren<object>) =>
    React.createElement('View', props, children),
}));
vi.mock('@/features/accounts/use-accounts', () => ({
  useAccounts: () => ({ data: mocks.accounts, isError: mocks.isError, refetch: mocks.refetch }),
}));
vi.mock('@/features/profile/use-current-user', () => ({
  useCurrentUser: () => ({ data: { id: 7 } }),
}));
vi.mock('@/features/onboarding/first-run-storage', () => ({
  firstRunStorage: { hintKey: () => 'hint', mark: mocks.mark },
}));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.show }) }));
vi.mock('@/features/forms/form-session', () => ({ openForm: mocks.openForm }));
vi.mock('@/ui/actions', () => ({
  QuickActionModal: (props: object) => React.createElement('QuickModal', props),
}));
vi.mock('@/ui/motion-modal', () => ({
  MotionModal: ({ visible, children }: React.PropsWithChildren<{ visible: boolean }>) =>
    visible ? React.createElement('Sheet', undefined, children) : null,
}));
vi.mock('@/ui/primitives', () => ({
  Button: ({ children, onPress }: React.PropsWithChildren<{ onPress: () => void }>) =>
    React.createElement('Button', { onPress }, children),
}));

import { QuickActionProvider, useQuickActions } from './quick-action-provider';

function OpenAction() {
  const actions = useQuickActions();
  return React.createElement('OpenAction', {
    onPress: actions.open,
    active: actions.active,
    count: actions.openedCount,
  });
}

function host(tree: ReturnType<typeof create>, name: string) {
  return tree.root.find((node) => (node.type as unknown) === name);
}

async function render() {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <QuickActionProvider>
        <OpenAction />
      </QuickActionProvider>,
    );
  });
  return tree;
}

async function open(tree: ReturnType<typeof create>) {
  await act(async () => {
    host(tree, 'OpenAction').props.onPress();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mocks.accounts = [];
  mocks.isError = false;
  vi.clearAllMocks();
  mocks.refetch.mockResolvedValue({ data: [], isError: false });
});

describe('central quick action', () => {
  it('opens the same forms and permits transfers only for two active accounts in one currency', async () => {
    mocks.accounts = [
      { active: true, currency: 'COP' },
      { active: true, currency: 'USD' },
    ];
    const tree = await render();
    await open(tree);
    const sheet = host(tree, 'QuickModal');
    expect(sheet.props.visible).toBe(true);
    expect(sheet.props.canTransfer).toBe(false);
    expect(host(tree, 'OpenAction').props.count).toBe(1);
    await act(async () => sheet.props.onExpense());
    expect(mocks.openForm).toHaveBeenLastCalledWith('/(app)/new-expense');
    mocks.accounts = [
      { active: true, currency: 'COP' },
      { active: true, currency: 'COP' },
    ];
    await act(async () =>
      tree.update(
        <QuickActionProvider>
          <OpenAction />
        </QuickActionProvider>,
      ),
    );
    await open(tree);
    expect(host(tree, 'QuickModal').props.canTransfer).toBe(true);
    await act(async () => host(tree, 'QuickModal').props.onTransfer());
    expect(mocks.openForm).toHaveBeenLastCalledWith('/(app)/new-transfer');
    await open(tree);
    await act(async () => host(tree, 'QuickModal').props.onIncome());
    expect(mocks.openForm).toHaveBeenLastCalledWith('/(app)/new-income');
  });

  it('guides a person without accounts to create one', async () => {
    const tree = await render();
    await open(tree);
    expect(host(tree, 'QuickModal').props.visible).toBe(false);
    const button = tree.root
      .findAll((node) => (node.type as unknown) === 'Button')
      .find((item) => item.children.join('') === 'Crear cuenta');
    expect(button).toBeDefined();
    await act(async () => button!.props.onPress());
    expect(mocks.openForm).toHaveBeenCalledWith('/(app)/account-form');
  });

  it('shows a retryable error when accounts cannot be loaded', async () => {
    mocks.accounts = undefined as unknown as typeof mocks.accounts;
    mocks.refetch.mockResolvedValue({ data: undefined, isError: true });
    const tree = await render();
    await open(tree);
    expect(mocks.show).toHaveBeenCalledWith(expect.stringContaining('cargar tus cuentas'), 'error');
    expect(host(tree, 'QuickModal').props.visible).toBe(false);
    expect(host(tree, 'OpenAction').props.count).toBe(0);
  });
});
