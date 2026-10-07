import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, create } from 'react-test-renderer';

const motionMocks = vi.hoisted(() => ({ reduced: false, timing: vi.fn() }));

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (value && typeof value === 'object' && 'children' in value) return textContent(value.children);
  return '';
}

vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
}));
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
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => motionMocks.reduced,
      addEventListener: () => ({ remove: vi.fn() }),
    },
    Animated: {
      View: primitive('AnimatedView'),
      Text: primitive('Text'),
      Value: class {
        setValue() {}
        interpolate() {
          return 1;
        }
      },
      timing: () => {
        motionMocks.timing();
        return {
          start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
          stop: vi.fn(),
        };
      },
    },
    ActivityIndicator: primitive('ActivityIndicator'),
    useWindowDimensions: () => ({ width: 360, height: 640, fontScale: 1 }),
    KeyboardAvoidingView: primitive('KeyboardAvoidingView'),
    Modal: primitive('Modal'),
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
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('SafeAreaView', undefined, children),
}));

import { AccountCard, TransactionRow } from './financial';
import { EmptyState, ErrorState } from './states';
import { CenterActionButton } from './center-action';
import { BrandMark } from './brand-identity';
import { ModalSelector } from './modal-selector';
import { Button, Card, MoneyInput, Screen } from './primitives';
import { colors, spacing } from '@/theme';

const actionMocks = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/features/quick-actions/quick-action-provider', () => ({
  useQuickActions: () => ({ open: actionMocks.open, active: false, openedCount: 0 }),
}));
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: React.PropsWithChildren) =>
    React.createElement('Gradient', undefined, children),
}));

describe('Finance Calm components', () => {
  it('keeps Home content scrollable without an independent bottom action', async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <Screen scroll>
          <Button>Última fila</Button>
        </Screen>,
      );
    });
    const scroll = tree.root.find((node) => (node.type as unknown) === 'ScrollView');
    expect(textContent(scroll)).toContain('Última fila');
    expect(scroll.findAll((node) => node.props.accessibilityLabel === 'Registrar movimiento')).toHaveLength(
      0,
    );
    expect(Object.assign({}, ...scroll.props.contentContainerStyle.filter(Boolean)).paddingBottom).toBe(
      spacing.huge,
    );
    await act(async () => tree.unmount());
  });
  it('keeps screen section spacing inside the animation wrapper', async () => {
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <Screen entry scroll style={{ gap: 24 }}>
          <Button>Primero</Button>
          <Button>Segundo</Button>
        </Screen>,
      );
    });
    const entry = tree.root
      .findAll((node) => String(node.type) === 'AnimatedView')
      .find((node) => Array.isArray(node.props.style) && node.props.style[0]?.gap === 24);
    expect(entry).toBeDefined();
    expect(textContent(entry)).toContain('PrimeroSegundo');
    await act(async () => tree.unmount());
  });
  it('disables Button when loading', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<Button loading>Guardar</Button>);
    });
    expect(tree!.root.find((node) => node.props.accessibilityRole === 'button').props.disabled).toBe(true);
  });

  it.each([
    ['primary', colors.primaryStrong],
    ['secondary', colors.primarySoft],
    ['outline', colors.surface],
    ['danger', colors.danger],
  ] as const)('renders the %s Button variant with a semantic surface', async (variant, backgroundColor) => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<Button variant={variant}>Acción</Button>);
    });
    const button = tree!.root.find((node) => node.props.accessibilityRole === 'button');
    const styles = button.props.style({ pressed: false }) as Array<Record<string, unknown> | false>;
    expect(styles).toContainEqual(expect.objectContaining({ backgroundColor }));
  });

  it('applies a semantic Card tone', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<Card tone="warning">Contenido</Card>);
    });
    const card = tree!.root.find(
      (node) =>
        Array.isArray(node.props.style) &&
        node.props.style.some(
          (style: Record<string, unknown>) => style?.backgroundColor === colors.warningSoft,
        ),
    );
    expect(card.props.style).toContainEqual(expect.objectContaining({ backgroundColor: colors.warningSoft }));
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

  it.each(['Crear cuenta', 'Crear presupuesto', 'Registrar movimiento'])(
    'renders the %s empty-state CTA as a real button action',
    async (actionLabel) => {
      const action = vi.fn();
      let tree: ReturnType<typeof create>;
      await act(async () => {
        tree = create(
          <EmptyState title="Vacío" description="Sin datos" actionLabel={actionLabel} onAction={action} />,
        );
      });
      const button = tree!.root.find(
        (node) => node.props.accessibilityLabel === actionLabel && node.props.accessibilityRole === 'button',
      );
      expect(button.props.accessibilityRole).toBe('button');
      button.props.onPress();
      expect(action).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ['Crear cuenta', 'primary', colors.primarySoft],
    ['Crear presupuesto', 'warning', colors.warningSoft],
    ['Registrar movimiento', 'info', colors.infoSoft],
  ] as const)('renders %s as a compact tonal CTA', async (actionLabel, tone, backgroundColor) => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <EmptyState title="Vacío" description="Sin datos" actionLabel={actionLabel} tone={tone} />,
      );
    });
    const button = tree!.root.find(
      (node) => node.props.accessibilityLabel === actionLabel && node.props.accessibilityRole === 'button',
    );
    const styles = button.props.style({ pressed: false }) as Array<Record<string, unknown> | false>;
    expect(styles).toContainEqual(expect.objectContaining({ minHeight: 44 }));
    expect(styles).toContainEqual(expect.objectContaining({ backgroundColor }));
  });

  it('keeps the center action a labelled touch target', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<CenterActionButton />);
    });
    const action = tree!.root.find((node) => node.props.accessibilityLabel === 'Registrar movimiento');
    expect(action.props.accessibilityRole).toBe('button');
    await act(async () => action.props.onPress());
    expect(actionMocks.open).toHaveBeenCalledOnce();
  });

  it('skips brand entrance and center rotation with reduced motion', async () => {
    motionMocks.reduced = true;
    motionMocks.timing.mockClear();
    let tree!: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <>
          <BrandMark />
          <CenterActionButton />
        </>,
      );
    });
    expect(motionMocks.timing).not.toHaveBeenCalled();
    await act(async () => tree.unmount());
    motionMocks.reduced = false;
  });

  it('marks the selected ModalSelector option', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(
        <ModalSelector
          visible
          label="Cuenta"
          selectedId={2}
          options={[{ id: 2, label: 'Principal' }]}
          onClose={() => undefined}
          onSelect={() => undefined}
        />,
      );
    });
    expect(tree!.root.findAll((node) => node.props.name === 'checkmark-circle').length).toBeGreaterThan(0);
  });
});
