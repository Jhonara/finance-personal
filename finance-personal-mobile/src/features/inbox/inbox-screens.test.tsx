import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Draft } from './inbox-api';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  alert: vi.fn(),
  hidden: false,
  params: {} as Record<string, string | string[]>,
  authStatus: 'authenticated',
}));
vi.mock('@/auth/auth-provider', () => ({
  api: mocks,
  useAuth: () => ({ state: { status: mocks.authStatus } }),
}));
vi.mock('expo-router', async () => {
  const React = await import('react');
  return {
    router: mocks,
    useLocalSearchParams: () => mocks.params,
    useFocusEffect: (callback: React.EffectCallback) => React.useEffect(callback, [callback]),
  };
});
vi.mock('@/features/forms/form-session', () => ({
  withFormSession: (value: unknown) => value,
  openForm: mocks.push,
}));
vi.mock('@/features/forms/use-unsaved-form', () => ({
  hasFormChanges: (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b),
  useUnsavedForm: () => ({ request: (action: () => void) => action() }),
}));
vi.mock('@/features/accounts/use-accounts', () => ({
  useAccounts: () => ({ data: [{ id: 1, name: 'Banco', currency: 'COP', active: true }] }),
}));
vi.mock('@/features/categories/use-categories', () => ({
  useCategories: () => ({ data: [{ id: 2, name: 'Comida', active: true }] }),
}));
vi.mock('@/privacy/privacy-provider', () => ({ usePrivacy: () => ({ hidden: mocks.hidden }) }));
vi.mock('@/feedback/app-alert', () => ({ AppAlert: { alert: mocks.alert } }));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View', Keyboard: { dismiss: vi.fn() } }));
vi.mock('@/theme', () => ({ colors: {}, spacing: {}, typography: {} }));
vi.mock('@/ui/primitives', () => ({
  Button: 'Button',
  Card: 'Card',
  Input: 'Input',
  MoneyInput: 'MoneyInput',
  Screen: 'Screen',
  SelectField: 'SelectField',
}));
vi.mock('@/ui/headers', () => ({ ScreenHeader: 'ScreenHeader' }));
vi.mock('@/ui/disclosure', () => ({ Disclosure: 'Disclosure' }));
vi.mock('@/ui/states', () => ({
  EmptyState: 'EmptyState',
  ErrorState: 'ErrorState',
  SkeletonRow: 'SkeletonRow',
}));
vi.mock('@/ui/financial-date-field', () => ({ FinancialDateField: 'FinancialDateField' }));
vi.mock('@/ui/modal-selector', () => ({ ModalSelector: 'ModalSelector' }));
vi.mock('@/features/transactions/linked-transaction-detail', () => ({
  LinkedTransactionDetail: 'LinkedTransactionDetail',
}));
import { PurchaseEditor } from '@/app/(app)/purchase-review';
import InboxScreen from '@/app/(app)/inbox';
import ShortcutScreen from '@/app/shortcut';

let renderer: ReactTestRenderer;
let client: QueryClient;
let draft: Draft;
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });
}
async function mount(element: React.ReactNode) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await act(async () => {
    renderer = create(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
  });
  await flush();
}
function find(type: string, prop: string, value: unknown) {
  return renderer.root.findAll((node) => node.type === type && node.props[prop] === value)[0]!;
}
async function press(label: string) {
  await act(async () => {
    find('Button', 'children', label).props.onPress();
  });
  await flush();
}
async function input(label: string, value: string) {
  await act(async () => find('Input', 'label', label).props.onChangeText(value));
}
async function parse() {
  await input('Texto del aviso', 'Compraste COP 85.000 en MERCADO el 20/10/2026 con tarjeta 1234.');
  await press('Revisar datos del texto');
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.hidden = false;
  mocks.params = {};
  mocks.authStatus = 'authenticated';
  draft = {
    id: 10,
    version: 0,
    status: 'PENDING',
    reviewToken: 'review-0',
    matches: [],
    fields: {
      kind: 'EXPENSE',
      description: 'MERCADO',
      amount: 85000,
      currency: 'COP',
      effectiveDate: '2026-10-20',
      accountId: 1,
      categoryId: 2,
    },
  };
  mocks.get.mockImplementation(async () => ({ data: draft }));
  mocks.post.mockImplementation(async (url: string, body: { fields?: Draft['fields'] }) => ({
    data:
      url === '/inbox' ? { ...draft, fields: body.fields } : { ...draft, status: 'POSTED', transactionId: 7 },
  }));
  mocks.put.mockImplementation(async (_url: string, body: { fields: Draft['fields'] }) => ({
    data: { ...draft, version: 1, fields: body.fields },
  }));
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  client?.clear();
  vi.unstubAllGlobals();
});

describe('Purchase review flow', () => {
  it('opens an external preview without exposing any save action or making a write', async () => {
    mocks.params = {
      v: '1',
      demo: '1',
      amount: '12500',
      kind: 'EXPENSE',
      currency: 'COP',
      description: 'Cafe de prueba',
      date: '2026-10-20',
    };
    await mount(<ShortcutScreen />);
    expect(find('MoneyInput', 'label', 'Importe').props.value).toBe('12500');
    expect(
      renderer.root.findAll(
        (node) =>
          String(node.type) === 'Button' && /Guardar|registrar gasto/i.test(String(node.props.children)),
      ),
    ).toHaveLength(0);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });
  it('requires an app session before mounting the imported financial form', async () => {
    mocks.authStatus = 'unauthenticated';
    mocks.params = { v: '1' };
    await mount(<ShortcutScreen />);
    expect(find('EmptyState', 'title', 'Inicia sesión para revisar la compra')).toBeTruthy();
    expect(renderer.root.findAll((node) => String(node.type) === 'MoneyInput')).toHaveLength(0);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
    await press('Iniciar sesión');
    expect(mocks.replace).toHaveBeenCalledWith('/(auth)/login');
  });
  it('rejects incoming account or confirmation parameters without writing', async () => {
    mocks.params = { v: '1', accountId: '1', confirm: 'true' };
    await mount(<ShortcutScreen />);
    expect(find('EmptyState', 'title', 'No pudimos abrir esta compra')).toBeTruthy();
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('uses the shortcut request identity and origin only when the user saves', async () => {
    mocks.params = {
      v: '1',
      kind: 'EXPENSE',
      description: 'Comercio',
      id: '12345678-1234-1234-1234-123456789012',
    };
    await mount(<ShortcutScreen />);
    expect(mocks.post).not.toHaveBeenCalled();
    await press('Guardar para revisar');
    expect(mocks.post).toHaveBeenCalledWith(
      '/inbox',
      expect.objectContaining({
        source: 'SHORTCUT',
        requestKey: `shortcut-${mocks.params.id}`,
        fields: expect.objectContaining({ description: 'Comercio' }),
      }),
    );
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it('keeps current edits when a second shortcut arrives, until the user switches', async () => {
    mocks.params = { v: '1', kind: 'EXPENSE', description: 'Primera compra' };
    await mount(<ShortcutScreen />);
    await input('Comercio o concepto', 'Mi corrección');
    mocks.params = { v: '1', kind: 'EXPENSE', description: 'Segunda compra' };
    await act(async () =>
      renderer.update(
        <QueryClientProvider client={client}>
          <ShortcutScreen />
        </QueryClientProvider>,
      ),
    );
    expect(find('Input', 'label', 'Comercio o concepto').props.value).toBe('Mi corrección');
    await press('Revisar el nuevo enlace');
    expect(find('Input', 'label', 'Comercio o concepto').props.value).toBe('Segunda compra');
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('returns the original receipt on a replay without attempting to edit a posted draft', async () => {
    mocks.params = {
      v: '1',
      kind: 'EXPENSE',
      description: 'Comercio',
      id: '12345678-1234-1234-1234-123456789012',
    };
    await mount(<ShortcutScreen />);
    mocks.post.mockResolvedValue({
      data: { ...draft, status: 'POSTED', transactionId: 7, source: 'SHORTCUT' },
    });
    await press('Guardar para revisar');
    expect(find('EmptyState', 'title', 'Gasto registrado')).toBeTruthy();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it('interprets locally and sends only reviewed fields when explicitly saved', async () => {
    await mount(<PurchaseEditor />);
    await parse();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(find('MoneyInput', 'label', 'Importe').props.value).toBe('85000');
    await input('Comercio o concepto', 'Mercado corregido');
    await press('Guardar para revisar');
    const [url, payload] = mocks.post.mock.calls[0]!;
    expect(url).toBe('/inbox');
    expect(Object.keys(payload).sort()).toEqual(['fields', 'requestKey']);
    expect(payload.fields).toMatchObject({ description: 'Mercado corregido', amount: 85000 });
    expect(JSON.stringify(payload)).not.toContain('1234');
    expect(mocks.post.mock.calls.some(([path]) => path.endsWith('/confirm'))).toBe(false);
  });
  it('keeps edits after uncertainty and recovers the same create before updating later changes', async () => {
    await mount(<PurchaseEditor />);
    await parse();
    mocks.post.mockRejectedValueOnce({ response: { status: 503 } });
    await press('Guardar para revisar');
    expect(find('Input', 'label', 'Comercio o concepto').props.value).toBe('MERCADO');
    await input('Comercio o concepto', 'Nueva descripción');
    await press('Guardar para revisar');
    expect(mocks.post.mock.calls).toHaveLength(2);
    expect(mocks.post.mock.calls[0]![1]).toEqual(mocks.post.mock.calls[1]![1]);
    expect(mocks.put).toHaveBeenCalledWith(
      '/inbox/10',
      expect.objectContaining({ fields: expect.objectContaining({ description: 'Nueva descripción' }) }),
    );
  });
  it('blocks double confirmation and refreshes the financial views only after posting', async () => {
    await mount(<PurchaseEditor initial={draft} />);
    let finish!: (value: object) => void;
    mocks.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await act(async () => {
      const button = find('Button', 'children', 'Confirmar y registrar gasto');
      button.props.onPress();
      button.props.onPress();
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith('/inbox/10/confirm', {
      version: 0,
      reviewToken: 'review-0',
      distinctPurchase: false,
    });
    await act(async () => finish({ data: { ...draft, status: 'POSTED', transactionId: 7 } }));
    await flush();
    expect(find('EmptyState', 'title', 'Gasto registrado')).toBeTruthy();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['accounts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reports'] });
  });
  it('links an existing movement only after confirmation and never posts a second expense', async () => {
    draft.matches = [
      {
        id: 7,
        kind: 'TRANSACTION',
        description: 'Mercado',
        amount: 85000,
        currency: 'COP',
        date: '2026-10-20',
        transactionType: 'EXPENSE',
      },
    ];
    await mount(<PurchaseEditor initial={draft} />);
    await press('Ya está registrado');
    expect(mocks.post).not.toHaveBeenCalled();
    mocks.post.mockResolvedValue({ data: { ...draft, status: 'LINKED', transactionId: 7 } });
    await act(async () =>
      mocks.alert.mock.calls[0]![2].find(
        (action: { text: string }) => action.text === 'Sí, vincular',
      ).onPress(),
    );
    await flush();
    expect(mocks.post).toHaveBeenCalledWith('/inbox/10/link', { version: 0, transactionId: 7 });
    expect(find('EmptyState', 'title', 'Vinculado al movimiento existente')).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it('does not offer expense posting for a credit, transfer or income draft', async () => {
    draft.fields!.kind = 'OTHER';
    await mount(<PurchaseEditor initial={draft} />);
    expect(
      renderer.root.findAll(
        (node) => String(node.type) === 'Button' && /registrar gasto/i.test(String(node.props.children)),
      ),
    ).toHaveLength(0);
    await press('Ir a créditos');
    expect(mocks.push).toHaveBeenCalledWith('/(app)/credits');
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('prevents an older focus refresh from replacing a confirmed receipt', async () => {
    let finish!: (value: object) => void;
    mocks.get.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await mount(<PurchaseEditor initial={draft} />);
    await press('Confirmar y registrar gasto');
    await act(async () => finish({ data: draft }));
    await flush();
    expect(find('EmptyState', 'title', 'Gasto registrado')).toBeTruthy();
  });
  it('keeps a stale review and requires refreshing before attempting again', async () => {
    await mount(<PurchaseEditor initial={draft} />);
    mocks.post.mockRejectedValue({
      response: { status: 409, data: { message: 'Las coincidencias cambiaron.' } },
    });
    await press('Confirmar y registrar gasto');
    expect(find('Button', 'children', 'Confirmar y registrar gasto').props.disabled).toBe(true);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    draft = { ...draft, version: 1, reviewToken: 'review-1' };
    await press('Actualizar revisión');
    expect(find('Button', 'children', 'Confirmar y registrar gasto').props.disabled).toBe(false);
  });
  it('shows missing amounts as incomplete and respects hidden amounts in the inbox', async () => {
    mocks.get.mockResolvedValue({
      data: { content: [{ ...draft, fields: { ...draft.fields, amount: null } }], totalElements: 1 },
    });
    await mount(<InboxScreen />);
    expect(JSON.stringify(renderer.toJSON())).toContain('Importe o moneda por completar');
    mocks.hidden = true;
    mocks.get.mockResolvedValue({ data: { content: [draft], totalElements: 1 } });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['inbox'] });
    });
    await flush();
    expect(JSON.stringify(renderer.toJSON())).not.toContain('85.000');
  });
});
