import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const native = vi.hoisted(() => ({ scheme: 'dark' as 'dark' | 'light', formMounts: 0 }));
vi.mock('react-native', () => ({
  Text: 'Text',
  Image: 'Image',
  View: 'View',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  ScrollView: 'ScrollView',
  RefreshControl: 'RefreshControl',
  Modal: 'Modal',
  Animated: {
    View: 'AnimatedView',
    Value: class {
      setValue() {}
    },
  },
  StyleSheet: { create: (styles: object) => styles },
  Platform: { OS: 'android', select: (values: Record<string, unknown>) => values.android ?? values.default },
  useColorScheme: () => native.scheme,
  useWindowDimensions: () => ({ width: 393, height: 800, fontScale: 1 }),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: 'Gradient' }));
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('@/ui/motion', () => ({
  MotionPressable: 'Pressable',
  MotionEntry: 'MotionEntry',
  ScreenEntry: 'ScreenEntry',
}));
vi.mock('@/ui/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('@/ui/use-modal-motion', () => ({
  useModalMotion: (present: boolean, close: () => void) => ({ present, close, overlay: {}, sheet: {} }),
}));
vi.mock('@/ui/quick-category-modal', () => ({ QuickCategoryModal: 'QuickCategoryModal' }));
vi.mock('expo-router', () => ({
  router: { back: vi.fn(), canGoBack: () => true },
  useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
}));

import { AppThemeProvider, useAppTheme } from '@/theme/theme-provider';
import { lightPalette, setThemeColors, typography } from '@/theme';
import { BrandSurface } from './brand-surface';
import { BrandAvatar, BrandLogo } from './brand-identity';
import { Disclosure } from './disclosure';
import { CategoryHierarchyField } from './category-hierarchy-field';
import { ModalSelector } from './modal-selector';
import { Input, MoneyInput, SelectField } from './primitives';
import {
  MovementAmountPanel,
  MovementFormHeader,
  MovementFormIntro,
  MovementFormSection,
  MovementOptionalDetails,
} from './movement-form';

function Controls() {
  return React.createElement('Controls', useAppTheme());
}
function Identity({ panorama }: { panorama: boolean }) {
  const { palette } = useAppTheme();
  return React.createElement(
    'Text',
    { style: { color: panorama ? '#FFFFFF' : palette.textPrimary } },
    'Identidad',
  );
}
function DraftProbe() {
  const [value, setValue] = React.useState('Nota pendiente');
  return React.createElement('DraftProbe', { value, setValue });
}
const surfaceContent = (
  <>
    <Controls />
    {([undefined, 'insight', 'credit', 'panorama'] as const).map((tone) => (
      <BrandSurface tone={tone} key={tone ?? 'default'}>
        <Identity panorama={tone === 'panorama'} />
      </BrandSurface>
    ))}
    <Disclosure title="Opciones de Inicio">
      <DraftProbe />
    </Disclosure>
    <BrandAvatar />
    <BrandLogo />
  </>
);
function FinancialForm() {
  const [amount, setAmount] = React.useState('50000');
  React.useEffect(() => {
    native.formMounts += 1;
  }, []);
  return (
    <>
      <MovementFormHeader title="Nuevo ingreso" onBack={() => undefined} />
      <MovementFormIntro
        kind="income"
        title="¿Cuánto recibiste?"
        description="Guarda el ingreso en la cuenta correcta."
      />
      <MovementAmountPanel kind="income">
        <MoneyInput label="Monto recibido" value={amount} onChangeText={setAmount} />
      </MovementAmountPanel>
      <MovementFormSection
        title="Cuenta de entrada"
        subtitle="¿Dónde recibiste el dinero?"
        icon="wallet-outline"
      >
        <SelectField label="Cuenta" value="Banco de pruebas" />
      </MovementFormSection>
      <MovementFormSection title="Organiza este ingreso" icon="folder-outline">
        <CategoryHierarchyField
          categories={[
            { id: 1, name: 'Ingresos laborales', type: 'INCOME', active: true },
            { id: 2, name: 'Nómina', parentCategoryId: 1, type: 'INCOME', active: true },
          ]}
          value={2}
          type="INCOME"
          onChange={() => undefined}
        />
      </MovementFormSection>
      <MovementOptionalDetails open onToggle={() => undefined}>
        <Input label="Nota" value="Sin guardar todavía" />
      </MovementOptionalDetails>
    </>
  );
}
const formContent = (
  <>
    <Controls />
    <FinancialForm />
  </>
);
let tree: ReactTestRenderer | undefined;
async function render(content: React.ReactNode) {
  await act(async () => {
    tree = create(<AppThemeProvider>{content}</AppThemeProvider>);
  });
}
const hosts = (name: string) => tree!.root.findAll((node) => (node.type as unknown) === name);
const controls = () => hosts('Controls')[0]!.props;
const flatten = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flatten))
    : style && typeof style === 'object'
      ? (style as Record<string, unknown>)
      : {};
function luminance(hex: string) {
  const rgb = hex
    .replace('#', '')
    .match(/../g)!
    .map((part) => parseInt(part, 16) / 255);
  const linear = rgb.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}
function contrast(ink: string, background: string) {
  const values = [luminance(ink), luminance(background)].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}
function textNode(label: string) {
  return hosts('Text').find((node) => node.children.join('') === label)!;
}

beforeEach(() => {
  native.scheme = 'dark';
  native.formMounts = 0;
  vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
});
afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  setThemeColors(lightPalette);
});

describe('retained shared surfaces follow appearance', () => {
  it('keeps mutable typography reactive with the project React transform configuration', async () => {
    const require = createRequire(import.meta.url);
    const babel = require('@babel/core') as {
      transformSync(source: string, options: object): { code: string };
    };
    const config = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8')) as {
      expo: { experiments: { reactCompiler: boolean } };
    };
    const source = `function MutableTokenHeading() {
      useAppTheme();
      return <Text style={typography.cardTitle}>Categoría y subcategoría</Text>;
    }`;
    const transformed = babel.transformSync(source, {
      filename: 'MutableTokenHeading.jsx',
      configFile: false,
      babelrc: false,
      plugins: [
        ...(config.expo.experiments.reactCompiler ? [['babel-plugin-react-compiler', { target: '19' }]] : []),
        ['@babel/plugin-transform-react-jsx', { runtime: 'classic' }],
        '@babel/plugin-transform-modules-commonjs',
      ],
    });
    const Heading = new Function(
      'React',
      'Text',
      'useAppTheme',
      'typography',
      'require',
      'exports',
      `${transformed.code}\nreturn MutableTokenHeading;`,
    )(React, 'Text', useAppTheme, typography, require, {}) as React.ComponentType;
    await render(
      <>
        <Controls />
        <Heading />
      </>,
    );
    expect(flatten(textNode('Categoría y subcategoría').props.style).color).toBe(
      controls().palette.textPrimary,
    );
    await act(async () => controls().setMode('light'));
    expect(flatten(textNode('Categoría y subcategoría').props.style).color).toBe(lightPalette.textPrimary);
  });

  it('updates brand gradients, identity, avatar and expanded disclosure from dark to light without resetting content', async () => {
    await render(surfaceContent);
    const disclosure = () => tree!.root.findByType(Disclosure);
    await act(async () =>
      disclosure()
        .findByType('Pressable' as never)
        .props.onPress(),
    );
    await act(async () => hosts('DraftProbe')[0]!.props.setValue('Conservar esta nota'));
    const darkColors = tree!.root
      .findAllByType(BrandSurface)
      .map((node) => node.findByType('Gradient' as never).props.colors);
    await act(async () => controls().setMode('light'));
    expect(hosts('DraftProbe')[0]!.props.value).toBe('Conservar esta nota');
    expect(disclosure().findByType('Pressable' as never).props.accessibilityState.expanded).toBe(true);
    expect(flatten(disclosure().findByType('View' as never).props.style).backgroundColor).toBe(
      lightPalette.surface,
    );
    expect(flatten(textNode('Opciones de Inicio').props.style).color).toBe(lightPalette.primary);
    const surfaces = tree!.root.findAllByType(BrandSurface);
    for (const [index, node] of surfaces.entries()) {
      const gradient = node.findByType('Gradient' as never).props.colors as string[];
      expect(gradient).not.toEqual(darkColors[index]);
      const ink = flatten(node.findByType('Text' as never).props.style).color as string;
      expect(gradient.every((color) => contrast(ink, color) >= 4.5)).toBe(true);
    }
    expect(tree!.root.findByType(BrandAvatar).findByType('View' as never).props.style.backgroundColor).toBe(
      lightPalette.secondarySoft,
    );
    expect(flatten(textNode('Finance Personal').props.style).color).toBe(lightPalette.textPrimary);
  });

  it('refreshes a retained income form from light to system dark and back, including its selected category and open selector', async () => {
    native.scheme = 'light';
    await render(formContent);
    const field = () => tree!.root.findByType(CategoryHierarchyField);
    await act(async () =>
      field()
        .findAllByType(SelectField)
        .find((node) => node.props.label === 'Categoría padre')!
        .props.onPress(),
    );
    const parentSelector = () =>
      field()
        .findAllByType(ModalSelector)
        .find((node) => node.props.label === 'Categoría padre')!;
    native.scheme = 'dark';
    await act(async () => controls().setMode('dark'));
    await act(async () => controls().setMode('system'));
    for (const label of [
      'Nuevo ingreso',
      '¿Cuánto recibiste?',
      'Cuenta de entrada',
      'Organiza este ingreso',
      'Categoría y subcategoría',
      'Detalles opcionales',
    ]) {
      expect(flatten(textNode(label).props.style).color).toBe(controls().palette.textPrimary);
    }
    const amountPanel = tree!.root.findByType(MovementAmountPanel).findByType('View' as never);
    expect(flatten(amountPanel.props.style).backgroundColor).toBe(controls().palette.surface);
    expect(tree!.root.findByType(MovementFormIntro).findByType('Gradient' as never).props.colors).toEqual([
      controls().palette.successSoft,
      controls().palette.surface,
    ]);
    expect(tree!.root.findByType(MoneyInput).props.value).toBe('50000');
    expect(parentSelector().props).toMatchObject({ visible: true, selectedId: 1 });
    expect(
      field()
        .findAllByType(SelectField)
        .find((node) => node.props.label === 'Subcategoría')!.props.value,
    ).toBe('Nómina');
    await act(async () => controls().setMode('light'));
    expect(flatten(textNode('Nuevo ingreso').props.style).color).toBe(lightPalette.textPrimary);
    expect(flatten(amountPanel.props.style).backgroundColor).toBe(lightPalette.surface);
    expect(parentSelector().props.visible).toBe(true);
    expect(native.formMounts).toBe(1);
  });
});
