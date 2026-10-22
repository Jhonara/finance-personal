import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  show: vi.fn(),
  hidden: false,
  params: { type: 'INCOME' } as Record<string, string>,
}));
vi.mock('@/auth/auth-provider', () => ({ api: mocks }));
vi.mock('expo-router', () => ({
  router: mocks,
  useLocalSearchParams: () => mocks.params,
  useFocusEffect: () => {},
}));
vi.mock('@/features/forms/form-session', () => ({
  withFormSession: (component: unknown) => component,
  useFormSessionActive: () => () => true,
  openForm: mocks.push,
}));
vi.mock('@/privacy/privacy-provider', () => ({ usePrivacy: () => ({ hidden: mocks.hidden }) }));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.show }) }));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View', Switch: 'Switch', Alert: { alert: vi.fn() } }));
vi.mock('@/theme', () => ({
  colors: { danger: 'red', success: 'green', textPrimary: 'black' },
  spacing: { sm: 8, md: 12 },
  typography: {},
}));
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
vi.mock('@/ui/quick-category-modal', () => ({ QuickCategoryModal: 'QuickCategoryModal' }));
vi.mock('@/ui/motion-modal', () => ({ MotionModal: 'MotionModal' }));
vi.mock('@/features/credits/credit-payment-form', () => ({ CreditPaymentForm: 'CreditPaymentForm' }));
import RecurrencesScreen from '@/app/(app)/recurrences';
import RecurringForm from '@/app/(app)/recurring-form';
import { scheduleLabel } from './recurrence-presentation';
import { presentAlert } from '@/features/alerts/alert-presentation';
import { alertDestination } from '@/features/alerts/alert-navigation';

let renderer: ReactTestRenderer;
let client: QueryClient;
const future = '2099-12-31';
let entries: object[];
const entry = {
  id: 1,
  ruleId: 1,
  name: 'Salario',
  kind: 'INCOME',
  mode: 'CONFIRM',
  dueDate: '2026-01-01',
  amount: 1500000,
  currency: 'COP',
  accountId: 1,
  accountName: 'Banco',
  status: 'PENDING',
};
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
  });
}
async function mount(component: React.ReactNode) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await act(async () => {
    renderer = create(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
  });
  await flush();
}
function find(type: string, prop: string, value: unknown) {
  return renderer.root.findAll((n) => n.type === type && n.props[prop] === value)[0]!;
}
async function press(label: string) {
  await act(async () => {
    find('Button', 'children', label).props.onPress();
  });
  await flush();
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.hidden = false;
  mocks.params = { type: 'INCOME' };
  entries = [];
  mocks.get.mockImplementation(async (url: string) => ({
    data:
      url === '/recurrences/agenda'
        ? { entries }
        : url === '/recurrences'
          ? []
          : url === '/accounts'
            ? [{ id: 1, name: 'Banco', currency: 'COP', active: true }]
            : url === '/categories'
              ? [{ id: 2, name: 'Salario', type: 'INCOME', active: true }]
              : url === '/credits'
                ? [
                    {
                      id: 3,
                      name: 'Moto',
                      status: 'ACTIVE',
                      currency: 'COP',
                      expectedPaymentAmount: 200000,
                      nextPaymentDate: future,
                    },
                  ]
                : [],
  }));
  mocks.post.mockResolvedValue({ data: {} });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  client?.clear();
});

describe('recurring payments', () => {
  it('only offers resource creation when choosing an account or category, not a frequency', async () => {
    await mount(<RecurringForm />);
    await act(async () => find('SelectField', 'label', '¿Cada cuánto?').props.onPress());
    expect(find('ModalSelector', 'visible', true).props.onEmptyAction).toBeUndefined();
    await act(async () => find('ModalSelector', 'visible', true).props.onClose());
    await act(async () => find('SelectField', 'label', 'Cuenta que recibe el dinero').props.onPress());
    expect(find('ModalSelector', 'visible', true).props.emptyActionLabel).toBe('Crear cuenta');
  });
  it('does not offer manual confirmation while an automatic entry is awaiting the scheduler', async () => {
    entries = [{ ...entry, id: null, mode: 'AUTOMATIC' }];
    await mount(<RecurrencesScreen />);
    expect(
      renderer.root.findAll((n) => String(n.type) === 'Button' && n.props.children === 'Confirmar ingreso'),
    ).toHaveLength(0);
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('keeps future payments informational and uses the existing credit-payment flow', async () => {
    entries = [{ ...entry, id: null, status: 'PLANNED', dueDate: future }];
    await mount(<RecurrencesScreen />);
    expect(
      renderer.root.findAll((n) => String(n.type) === 'Button' && n.props.children === 'Confirmar ingreso'),
    ).toHaveLength(0);
    await press('Registrar pago de crédito');
    expect(renderer.root.findAll((n) => String(n.type) === 'CreditPaymentForm')[0]?.props.credit.id).toBe(3);
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it('confirms a due occurrence with the actual amount and prevents duplicate taps', async () => {
    entries = [entry];
    await mount(<RecurrencesScreen />);
    await press('Confirmar ingreso');
    await act(async () => find('MoneyInput', 'label', 'Importe real').props.onChangeText('1550000'));
    let resolve!: (value: object) => void;
    mocks.post.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await act(async () => {
      const button = find('Button', 'children', 'Registrar movimiento');
      button.props.onPress();
      button.props.onPress();
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith(
      '/recurrences/1/occurrences/2026-01-01/confirm',
      expect.objectContaining({ amount: 1550000 }),
    );
    await act(async () => resolve({ data: { ...entry, status: 'POSTED' } }));
    await flush();
  });
  it('preserves the form and request key after a failed save', async () => {
    await mount(<RecurringForm />);
    await act(async () => {
      find('Input', 'label', 'Nombre').props.onChangeText('Mi salario');
      find('MoneyInput', 'label', 'Importe de cada pago').props.onChangeText('1500000');
      find('FinancialDateField', 'label', 'Empezar a partir de').props.onChange(future);
      find('SelectField', 'label', 'Cuenta que recibe el dinero').props.onPress();
    });
    await act(async () => find('ModalSelector', 'visible', true).props.onSelect(1));
    mocks.post.mockRejectedValue({ response: { status: 503 } });
    await press('Guardar programación');
    await press('Guardar programación');
    expect(mocks.post).toHaveBeenCalledTimes(2);
    expect(mocks.post.mock.calls[0]?.[1].requestKey).toBe(mocks.post.mock.calls[1]?.[1].requestKey);
    expect(find('Input', 'label', 'Nombre').props.value).toBe('Mi salario');
    expect(mocks.post.mock.calls[0]?.[1]).toMatchObject({
      mode: 'AUTOMATIC',
      amount: 1500000,
      startDate: future,
    });
    expect(mocks.back).not.toHaveBeenCalled();
  });
  it('hides financial amounts in agenda and shows pending alerts with a working destination', async () => {
    entries = [entry];
    mocks.hidden = true;
    await mount(<RecurrencesScreen />);
    expect(JSON.stringify(renderer.toJSON())).not.toContain('1.500.000');
    const alert = presentAlert({ code: 'RECURRING_PENDING', data: { count: 2 } });
    expect(alert.context).toEqual(['2 por confirmar']);
    expect(alert.seen).toBeUndefined();
    expect(await alertDestination(alert.target, client)).toEqual({ pathname: '/(app)/recurrences' });
  });
  it('distinguishes calendar quincenas from fortnightly payments', () => {
    expect(scheduleLabel({ frequency: 'SEMIMONTHLY', firstDay: 15, secondDay: 31 })).toBe(
      '15 y último día de cada mes',
    );
    expect(scheduleLabel({ frequency: 'BIWEEKLY', firstDay: 15, secondDay: null })).toBe('Cada 14 días');
  });
});
