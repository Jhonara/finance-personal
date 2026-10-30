import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ native: vi.fn(), back: vi.fn() }));
vi.mock('react-native', () => ({
  Alert: { alert: mocks.native },
  Modal: 'Modal',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
  BackHandler: { addEventListener: () => ({ remove() {} }) },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@/ui/primitives', () => ({ Button: 'Button' }));
vi.mock('@/ui/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('expo-router', () => ({
  router: { back: mocks.back },
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
}));
import { ConfirmationProvider } from './confirmation-provider';
import { AppAlert } from './app-alert';
import { useUnsavedForm } from '@/features/forms/use-unsaved-form';

let tree: ReactTestRenderer;
function Draft() {
  return React.createElement('Draft', useUnsavedForm({ dirty: true }));
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  await act(async () => {
    tree = create(
      <ConfirmationProvider>
        <Draft />
      </ConfirmationProvider>,
    );
  });
});
afterEach(async () => {
  await act(async () => tree.unmount());
  vi.unstubAllGlobals();
});
const modal = () => tree.root.findByType('Modal' as never);
const button = (label: string) =>
  tree.root.findAllByType('Button' as never).find((node) => node.props.accessibilityLabel === label)!;
const askToLeave = () => tree.root.findByType('Draft' as never).props.request(mocks.back);

it('keeps a dirty form on cancel and Android Back, then discards only once', async () => {
  await act(async () => askToLeave());
  expect(modal().props.visible).toBe(true);
  expect(mocks.native).not.toHaveBeenCalled();
  await act(async () => button('Seguir editando').props.onPress());
  expect(modal().props.visible).toBe(false);
  expect(mocks.back).not.toHaveBeenCalled();
  await act(async () => askToLeave());
  await act(async () => modal().props.onRequestClose());
  expect(modal().props.visible).toBe(false);
  expect(mocks.back).not.toHaveBeenCalled();
  await act(async () => askToLeave());
  const discard = button('Descartar').props.onPress;
  await act(async () => {
    discard();
    discard();
  });
  expect(mocks.back).toHaveBeenCalledTimes(1);
});

it('does not let a double tap on an old action confirm a newly opened dialog', async () => {
  const second = vi.fn();
  await act(async () =>
    AppAlert.alert('Primero', '', [
      {
        text: 'Continuar',
        onPress: () => AppAlert.alert('Segundo', '', [{ text: 'Confirmar', onPress: second }]),
      },
    ]),
  );
  const first = button('Continuar').props.onPress;
  await act(async () => {
    first();
    first();
  });
  expect(second).not.toHaveBeenCalled();
  expect(button('Confirmar')).toBeDefined();
  await act(async () => button('Confirmar').props.onPress());
  expect(second).toHaveBeenCalledTimes(1);
});

it('honors a non-cancelable request and cleans up pending confirmations on unmount', async () => {
  const cancel = vi.fn();
  const dismiss = vi.fn();
  const confirm = vi.fn();
  await act(async () =>
    AppAlert.alert(
      'Revisar',
      'Detalle',
      [
        { text: 'Cancelar', style: 'cancel', onPress: cancel },
        { text: 'Confirmar', onPress: confirm },
      ],
      { cancelable: false, onDismiss: dismiss },
    ),
  );
  await act(async () => modal().props.onRequestClose());
  expect(modal().props.visible).toBe(true);
  expect(cancel).not.toHaveBeenCalled();
  const stale = button('Confirmar').props.onPress;
  await act(async () => tree.unmount());
  stale();
  expect(confirm).not.toHaveBeenCalled();
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(dismiss).toHaveBeenCalledTimes(1);
  AppAlert.alert('Sin proveedor');
  expect(mocks.native).toHaveBeenCalledWith('Sin proveedor');
});
