import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';

const native = vi.hoisted(() => ({ scheme: 'light' as 'light' | 'dark' }));
vi.mock('react-native', () => ({
  useColorScheme: () => native.scheme,
  StyleSheet: { create: (styles: object) => styles },
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
  Text: 'Text',
  View: 'View',
  Modal: 'Modal',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@/ui/primitives', () => ({ Button: 'Button' }));
vi.mock('@/ui/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('expo-router', () => ({
  router: { push: vi.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  useLocalSearchParams: () => ({ formSession: 'same-form', id: '', type: 'EXPENSE' }),
}));

import { AppThemeProvider, useAppTheme } from './theme-provider';
import { colors, lightPalette, setThemeColors, typography } from './index';
import { themedStyleSheet } from './themed-styles';
import { ConfirmationProvider } from '@/feedback/confirmation-provider';
import { AppAlert } from '@/feedback/app-alert';
import { withFormSession } from '@/features/forms/form-session';

const styles = themedStyleSheet(() => ({ panel: { backgroundColor: colors.surface } }));
function ThemeControls() {
  return React.createElement('ThemeControls', useAppTheme());
}
function FinancialForm() {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  return React.createElement('FinancialForm', {
    amount,
    busy,
    setAmount,
    setBusy,
    style: styles.panel,
    textStyle: typography.body,
  });
}
const FinancialRoute = withFormSession(FinancialForm);
const contents = (
  <>
    <ThemeControls />
    <ConfirmationProvider>
      <FinancialRoute />
    </ConfirmationProvider>
  </>
);
let tree: ReactTestRenderer | undefined;
async function render() {
  await act(async () => {
    if (tree) tree.update(<AppThemeProvider>{contents}</AppThemeProvider>);
    else tree = create(<AppThemeProvider>{contents}</AppThemeProvider>);
  });
}
function host(name: string) {
  return tree!.root.find((node) => (node.type as unknown) === name);
}

beforeEach(() => {
  native.scheme = 'light';
  vi.clearAllMocks();
  vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  setThemeColors(lightPalette);
});

describe('appearance transitions without losing the current task', () => {
  it('preserves a filled form and pending submission while switching light and dark', async () => {
    await render();
    await act(async () => {
      host('FinancialForm').props.setAmount('123456');
      host('FinancialForm').props.setBusy(true);
    });
    await act(async () => host('ThemeControls').props.setMode('dark'));
    expect(host('FinancialForm').props).toMatchObject({ amount: '123456', busy: true });
    expect(host('FinancialForm').props.style.backgroundColor).toBe('#11272D');
    expect(host('FinancialForm').props.textStyle.color).toBe('#EAF8F5');
    await act(async () => host('ThemeControls').props.setMode('light'));
    expect(host('FinancialForm').props).toMatchObject({ amount: '123456', busy: true });
    expect(host('FinancialForm').props.style.backgroundColor).toBe(lightPalette.surface);
    expect(host('FinancialForm').props.textStyle.color).toBe(lightPalette.textPrimary);
  });

  it('keeps an open confirmation and its single action when the system appearance changes', async () => {
    await render();
    const confirm = vi.fn();
    const cancel = vi.fn();
    await act(async () => {
      host('FinancialForm').props.setAmount('999');
      AppAlert.alert('Confirmar gasto', 'Revisa el importe.', [
        { text: 'Cancelar', style: 'cancel', onPress: cancel },
        { text: 'Guardar gasto', onPress: confirm },
      ]);
    });
    native.scheme = 'dark';
    await render();
    expect(host('FinancialForm').props.amount).toBe('999');
    expect(host('Modal').props.visible).toBe(true);
    expect(cancel).not.toHaveBeenCalled();
    const title = tree!.root
      .findAllByType('Text' as never)
      .find((node) => node.children[0] === 'Confirmar gasto');
    expect(title!.props.style.color).toBe('#EAF8F5');
    const save = tree!.root
      .findAllByType('Button' as never)
      .find((node) => node.props.accessibilityLabel === 'Guardar gasto')!;
    await act(async () => {
      save.props.onPress();
      save.props.onPress();
    });
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
