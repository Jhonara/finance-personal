import React from 'react';
import { act, create } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  id: 88,
  path: '/',
  read: vi.fn(),
  write: vi.fn(),
  navigate: vi.fn(),
  feedback: vi.fn(),
}));
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Platform: { select: (values: Record<string, unknown>) => values.default ?? values.android },
  StyleSheet: { create: (v: object) => v, absoluteFill: {} },
  BackHandler: { addEventListener: () => ({ remove: vi.fn() }) },
  useWindowDimensions: () => ({ width: 360, height: 640 }),
}));
vi.mock('expo-router', () => ({ router: { navigate: mocks.navigate }, usePathname: () => mocks.path }));
vi.mock('expo-secure-store', () => ({ getItemAsync: mocks.read, setItemAsync: mocks.write }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 24 }) }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Icon' }));
vi.mock('@/features/profile/use-current-user', () => ({
  useCurrentUser: () => ({ data: { id: mocks.id } }),
}));
vi.mock('@/feedback/feedback-provider', () => ({ useFeedback: () => ({ show: mocks.feedback }) }));
vi.mock('@/ui/brand-media', () => ({ BrandMascot: 'Mascot' }));
vi.mock('@/ui/journey-scene', () => ({ JourneyScene: ({ children }: React.PropsWithChildren) => children }));
vi.mock('@/ui/primitives', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren) => React.createElement('Button', props, children),
}));
import { InteractiveTourProvider } from './interactive-tour';
import { useTour } from './tour-context';
import { tourKey } from './tour-steps';
function Controls() {
  const tour = useTour();
  return (
    <>
      <button onClick={() => tour?.start()}>Start</button>
      <button onClick={() => tour?.start(true)}>Restart</button>
      <button onClick={() => tour?.pause()}>Pause</button>
      <button onClick={() => tour?.completeStep?.('add-account')}>Complete account</button>
    </>
  );
}
let tree: ReturnType<typeof create>;
const screen = () => (
  <InteractiveTourProvider>
    <Controls />
  </InteractiveTourProvider>
);
const copy = () => JSON.stringify(tree.toJSON());
async function press(label: string) {
  await act(async () => {
    const node = tree.root.findAll(
      (n) => (String(n.type) === 'button' || String(n.type) === 'Button') && n.props.children === label,
    )[0]!;
    (node.props.onClick ?? node.props.onPress)();
  });
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  mocks.id = 88;
  mocks.path = '/';
  mocks.read.mockResolvedValue(null);
  mocks.write.mockResolvedValue(undefined);
  mocks.navigate.mockImplementation((route: string) => {
    mocks.path = route.replace('/(app)', '') || '/';
  });
  await act(async () => {
    tree = create(screen());
  });
});
afterEach(async () => {
  await act(async () => tree.unmount());
});
it('starts on a real screen, moves to accounts and stores only reading progress', async () => {
  await press('Start');
  expect(copy()).toContain('Tu punto de partida');
  await press('Siguiente');
  expect(mocks.navigate).toHaveBeenLastCalledWith('/(app)/accounts');
  expect(mocks.write).toHaveBeenLastCalledWith(tourKey(88), '{"step":1,"done":false}');
  await press('Pause');
  expect(copy()).not.toContain('RECORRIDO');
});
it('resumes a saved step and can explicitly restart from the beginning', async () => {
  mocks.read.mockResolvedValue('{"step":2,"done":false}');
  await press('Start');
  expect(mocks.navigate).toHaveBeenLastCalledWith('/(app)/categories');
  await press('Restart');
  expect(mocks.navigate).toHaveBeenLastCalledWith('/(app)');
  expect(mocks.write).toHaveBeenLastCalledWith(tourKey(88), '{"step":0,"done":false}');
});
it('shows real setup completion after an action and lets the user continue', async () => {
  await press('Start');
  await press('Siguiente');
  await press('Pause');
  await press('Complete account');
  expect(copy()).toContain('¡Hecho!');
  await press('Continuar recorrido');
  expect(mocks.navigate).toHaveBeenLastCalledWith('/(app)/categories');
});
it('does not advance on a failed write and blocks double next presses', async () => {
  await press('Start');
  mocks.write.mockRejectedValueOnce(Error('unavailable'));
  await press('Siguiente');
  expect(copy()).toContain('No pudimos guardar el paso');
  expect(mocks.navigate).toHaveBeenCalledTimes(1);
  let resolve!: () => void;
  mocks.write.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  await act(async () => {
    const button = tree.root.findAll(
      (n) => String(n.type) === 'Button' && n.props.children === 'Siguiente',
    )[0]!;
    button.props.onPress();
    button.props.onPress();
  });
  expect(mocks.write).toHaveBeenCalledTimes(3);
  await act(async () => resolve());
  expect(mocks.navigate).toHaveBeenCalledTimes(2);
});
it('removes the current tour when the signed-in user changes', async () => {
  await press('Start');
  mocks.id = 99;
  await act(async () => tree.update(screen()));
  expect(copy()).not.toContain('RECORRIDO');
  await press('Start');
  expect(mocks.read).toHaveBeenLastCalledWith(tourKey(99));
});
