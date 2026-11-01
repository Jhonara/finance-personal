import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkPalette, lightPalette, setThemeColors } from './index';

const STORAGE_KEY = 'finance-personal.appearance.v1';
export type AppearanceMode = 'system' | 'light' | 'dark';

const dark = darkPalette;

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
      palette: isDark ? dark : lightPalette,
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
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeValue {
  const theme = useContext(ThemeContext);
  return theme ?? { mode: 'light', isDark: false, palette: colors, setMode: async () => undefined };
}
