import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, create } from 'react-test-renderer';

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (value && typeof value === 'object' && 'children' in value) return textContent(value.children);
  return '';
}

vi.mock('react-native', () => {
  const primitive =
    (name: string) =>
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
    }) =>
      React.createElement(
        name,
        props,
        typeof children === 'function' ? children({ pressed: false }) : children,
      );
  return {
    ActivityIndicator: primitive('ActivityIndicator'),
    KeyboardAvoidingView: primitive('KeyboardAvoidingView'),
    Pressable: primitive('Pressable'),
    ScrollView: primitive('ScrollView'),
    Text: primitive('Text'),
    TextInput: primitive('TextInput'),
    View: primitive('View'),
    StyleSheet: { create: (styles: object) => styles },
    Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
  };
});
vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: (props: Record<string, unknown>) => React.createElement('Ionicons', props),
}));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('SafeAreaView', undefined, children),
}));

import { AccountCard, TransactionRow } from './financial';
import { ErrorState } from './states';
import { Button, MoneyInput } from './primitives';

describe('Finance Calm components', () => {
  it('disables Button when loading', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<Button loading>Guardar</Button>);
    });
    expect(tree!.root.find((node) => node.props.accessibilityRole === 'button').props.disabled).toBe(true);
  });

  it('keeps MoneyInput values as strings', async () => {
    const changes: string[] = [];
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<MoneyInput value="" onChangeText={(value) => changes.push(value)} />);
    });
    tree!.root.find((node) => node.props.accessibilityLabel === 'Monto').props.onChangeText('$ 1.250,50abc');
    expect(changes).toEqual(['1250.50']);
  });

  it('makes an inactive account explicit', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <AccountCard name="Anterior" typeLabel="Cuenta" currency="COP" balance={0} active={false} />,
      );
    });
    expect(tree!.root.findAll((node) => (node.type as unknown) === 'Text').map(textContent)).toContain(
      'Cuenta · COP · Inactiva',
    );
  });

  it('renders transfer with its human-readable label', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<TransactionRow type="TRANSFER" title="Ahorro" subtitle="Hoy" amount={-1000} />);
    });
    expect(tree!.root.findAll((node) => (node.type as unknown) === 'Text').map(textContent)).toContain(
      'Transferencia · Hoy',
    );
  });

  it('executes ErrorState retry callback', async () => {
    const retry = vi.fn();
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<ErrorState onRetry={retry} />);
    });
    tree!.root.findAll((node) => node.props.accessibilityLabel === 'Reintentar')[0]!.props.onPress();
    expect(retry).toHaveBeenCalledOnce();
  });
});
