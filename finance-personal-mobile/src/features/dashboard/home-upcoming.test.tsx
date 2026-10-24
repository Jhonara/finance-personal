import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  get: vi.fn(),
  push: vi.fn(),
  hidden: false,
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write }));
vi.mock('@/auth/auth-provider', () => ({ api: { get: mocks.get } }));
vi.mock('expo-router', () => ({ router: { push: mocks.push } }));
vi.mock('react-native', () => ({ Text: 'Text', View: 'View', Switch: 'Switch' }));
vi.mock('@/ui/primitives', () => ({ Card: 'Card', Button: 'Button' }));
vi.mock('@/ui/motion', () => ({ MotionPressable: 'MotionPressable' }));
vi.mock('@/ui/settings-row', () => ({ SettingsRow: 'SettingsRow' }));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: vi.fn() }) }));
vi.mock('@/privacy/privacy-provider', () => ({ usePrivacy: () => ({ hidden: mocks.hidden }) }));
vi.mock('@/theme', () => ({ colors: {}, spacing: {}, typography: {} }));
import { HomeUpcoming } from './home-upcoming';
import { useHomeUpcoming, upcomingStorageKey, upcomingPreferenceKey } from './use-home-upcoming';

let client: QueryClient;
let tree: ReactTestRenderer;
let saved: Map<string, string>;
const entries = [
  {
    ruleId: 1,
    name: 'Salario',
    dueDate: '2026-10-31',
    amount: 1500000,
    currency: 'COP',
    kind: 'INCOME',
    status: 'PLANNED',
  },
  {
    ruleId: 2,
    name: 'Internet',
    dueDate: '2026-11-01',
    amount: 25,
    currency: 'USD',
    kind: 'EXPENSE',
    status: 'PENDING',
  },
  {
    ruleId: 3,
    name: 'Agua',
    dueDate: '2026-11-02',
    amount: 60000,
    currency: 'COP',
    kind: 'EXPENSE',
    status: 'PLANNED',
  },
];
function Probe({ userId }: { userId?: number }) {
  return React.createElement('Probe', useHomeUpcoming(userId));
}
const preference = () => tree.root.findByType('Probe' as never).props as ReturnType<typeof useHomeUpcoming>;
const contents = (child: React.ReactNode) => (
  <QueryClientProvider client={client}>{child}</QueryClientProvider>
);
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function mount(child: React.ReactNode) {
  await act(async () => {
    tree = create(contents(child));
  });
  await flush();
  await flush();
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  mocks.hidden = false;
  saved = new Map();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  mocks.read.mockImplementation(async (key: string) => saved.get(key) ?? null);
  mocks.write.mockImplementation(async (key: string, value: string) => {
    saved.set(key, value);
  });
  mocks.get.mockResolvedValue({ data: { from: '2026-10-30', to: '2026-11-05', total: 7, entries } });
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount());
  client.clear();
});

it('shows three dated events in their own currencies and opens the selected month across a month boundary', async () => {
  await mount(<HomeUpcoming userId={1} />);
  const rows = tree.root.findAllByType('MotionPressable' as never);
  expect(rows).toHaveLength(3);
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('1.500.000');
  expect(text).toContain('US$');
  expect(text).toContain('Aún no forman parte del saldo registrado');
  expect(text).toContain('7 previstos');
  await act(async () => rows[1]!.props.onPress());
  expect(mocks.push).toHaveBeenCalledWith({
    pathname: '/(app)/recurrences',
    params: expect.objectContaining({ agendaYear: '2026', agendaMonth: '11' }),
  });
});
it('hides amounts from both visible and accessibility content', async () => {
  mocks.hidden = true;
  await mount(<HomeUpcoming userId={1} />);
  const text = JSON.stringify(tree.toJSON());
  expect(text).not.toContain('1.500.000');
  expect(text).not.toContain('60.000');
  expect(text).toContain('Salario');
});
it('does not query or render the card when it is hidden, and hides an empty week', async () => {
  saved.set(upcomingStorageKey(1), 'hidden');
  await mount(<HomeUpcoming userId={1} />);
  expect(tree.toJSON()).toBeNull();
  expect(mocks.get).not.toHaveBeenCalled();
  mocks.get.mockResolvedValue({ data: { from: '2026-10-30', to: '2026-11-05', total: 0, entries: [] } });
  await act(async () => tree.update(contents(<HomeUpcoming userId={2} />)));
  await flush();
  await flush();
  expect(mocks.get).toHaveBeenCalledTimes(1);
  expect(tree.toJSON()).toBeNull();
});
it('persists visibility per profile and does not replace the saved choice after a write failure', async () => {
  await mount(<Probe userId={1} />);
  expect(preference().visible).toBe(true);
  mocks.write.mockRejectedValueOnce(new Error('Unavailable'));
  await act(async () => {
    await expect(preference().change(false)).rejects.toThrow('Unavailable');
  });
  expect(preference().visible).toBe(true);
  await act(async () => {
    await preference().change(false);
  });
  await flush();
  expect(saved.get(upcomingStorageKey(1))).toBe('hidden');
  await act(async () => tree.update(contents(<Probe userId={2} />)));
  await flush();
  expect(preference().visible).toBe(true);
  expect(client.getQueryData(upcomingPreferenceKey(1))).toBe(false);
  client.removeQueries({ queryKey: upcomingPreferenceKey(1) });
  await act(async () => tree.update(contents(<Probe userId={1} />)));
  await flush();
  expect(preference().visible).toBe(false);
});
it('never reads or overwrites settings without a profile or after a failed read', async () => {
  await mount(<Probe />);
  expect(preference().ready).toBe(false);
  await act(async () => {
    await preference().change(false);
  });
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.write).not.toHaveBeenCalled();
  mocks.read.mockRejectedValueOnce(new Error('Unavailable'));
  await act(async () => tree.update(contents(<Probe userId={1} />)));
  await flush();
  expect(preference().error).toBe(true);
  await act(async () => {
    await preference().change(false);
  });
  expect(mocks.write).not.toHaveBeenCalled();
});
