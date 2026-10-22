import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { colors, lightPalette, setThemeColors } from './index';

const STORAGE_KEY = 'finance-personal.appearance.v1';
export type AppearanceMode = 'system' | 'light' | 'dark';

const dark = {
  ...colors,
  background: '#09191E',
  surface: '#11272D',
  surfaceElevated: '#19343B',
  surfaceSecondary: '#17343A',
  text: '#EAF8F5',
  textPrimary: '#EAF8F5',
  textSecondary: '#B9D1D1',
  textMuted: '#A2BCBE',
  border: '#31545A',
  divider: '#29454A',
  primary: '#79E6C6',
  primaryStrong: '#235D61',
  primaryPressed: '#17464B',
  primarySoft: '#173D3B',
  secondarySoft: '#164D40',
  success: '#64DDB5',
  info: '#83C9E9',
  credit: '#83C9E9',
  warning: '#F1C982',
  danger: '#F19AA4',
  expense: '#F19AA4',
  accent: '#B0A0F0',
  lavender: '#B0A0F0',
  accentSoft: '#302C51',
  successSoft: '#164538',
  warningSoft: '#493C22',
  dangerSoft: '#4A2B31',
  expenseSoft: '#4A2B31',
  infoSoft: '#183E54',
  lavenderSoft: '#302C51',
  creditSoft: '#183E54',
  coralSoft: '#4A2B31',
  coralStrong: '#F19AA4',
  brandMist: '#123D38',
  brandGlow: 'rgba(121,230,198,0.07)',
} satisfies Record<keyof typeof colors, string>;

type ThemeValue = {
  mode: AppearanceMode;
  isDark: boolean;
  palette: Record<keyof typeof colors, string>;
  setMode(mode: AppearanceMode): Promise<void>;
};
const ThemeContext = createContext<ThemeValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');
  useEffect(() => {
    void import('expo-secure-store')
      .then((SecureStore) => SecureStore.getItemAsync(STORAGE_KEY))
      .then((saved) => {
        if (saved === 'system' || saved === 'light' || saved === 'dark') setModeState(saved);
      })
      .catch(() => undefined);
  }, []);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  setThemeColors(isDark ? dark : lightPalette);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(isDark ? dark.background : colors.background).catch(
      () => undefined,
    );
  }, [isDark]);
  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      isDark,
      palette: isDark ? dark : colors,
      async setMode(next) {
        setModeState(next);
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync(STORAGE_KEY, next);
      },
    }),
    [mode, isDark],
  );
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ThemeMount key={isDark ? 'dark' : 'light'}>{children}</ThemeMount>
    </ThemeContext.Provider>
  );
}

function ThemeMount({ children }: PropsWithChildren) {
  return <>{children}</>;
}

export function useAppTheme(): ThemeValue {
  const theme = useContext(ThemeContext);
  return theme ?? { mode: 'light', isDark: false, palette: colors, setMode: async () => undefined };
}
