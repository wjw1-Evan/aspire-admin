import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { storage } from '../utils/storage';
import Colors from '../constants/Colors';

export type ThemeMode = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme_mode';

interface ThemeContextType {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  colors: typeof Colors.light;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'auto',
  resolvedTheme: 'light',
  isDark: false,
  colors: Colors.light,
  setThemeMode: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    storage.get<ThemeMode>(STORAGE_KEY).then((saved) => {
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        setModeState(saved);
      }
    }).catch((e) => {
      if (__DEV__) console.error('Failed to load theme:', e);
    });
  }, []);

  const resolvedTheme: ResolvedTheme =
    mode === 'auto'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : mode;

  const isDark = resolvedTheme === 'dark';
  const colors = Colors[resolvedTheme];

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    storage.set(STORAGE_KEY, newMode);
  }, []);

  const contextValue = useMemo(
    () => ({ mode, resolvedTheme, isDark, colors, setThemeMode }),
    [mode, resolvedTheme, isDark, colors, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
