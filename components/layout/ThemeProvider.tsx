'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeName = 'honey' | 'blush' | 'lilac' | 'sage' | 'sky' | 'clay';
export type ModeName = 'light' | 'dark' | 'system';

type ThemeContext = {
  theme: ThemeName;
  mode: ModeName;
  resolvedMode: 'light' | 'dark';
  setTheme: (t: ThemeName) => void;
  setMode: (m: ModeName) => void;
};

const Ctx = createContext<ThemeContext | null>(null);

const resolve = (mode: ModeName): 'light' | 'dark' =>
  mode === 'system'
    ? typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : mode;

export function ThemeProvider({
  initialTheme,
  initialMode,
  children,
}: {
  initialTheme: ThemeName;
  initialMode: ModeName;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);
  const [mode, setModeState] = useState<ModeName>(initialMode);
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  // Apply to <html> so the CSS custom properties swap for the whole tree, and
  // remember the choice so the pre-paint script can restore it without a flash.
  useEffect(() => {
    const root = document.documentElement;
    const applied = resolve(mode);
    root.dataset.theme = theme;
    root.dataset.mode = applied;
    setResolvedMode(applied);

    try {
      localStorage.setItem('bloom-theme', theme);
      localStorage.setItem('bloom-mode', mode);
    } catch {
      /* private mode or blocked storage — the server preference still applies */
    }

    // Keep the iOS status bar tinted to match the current surface.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', applied === 'dark' ? '#181513' : '#FBF6EE');
  }, [theme, mode]);

  // Follow the OS while the user is on "system".
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const applied = mq.matches ? 'dark' : 'light';
      document.documentElement.dataset.mode = applied;
      setResolvedMode(applied);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);
  const setMode = useCallback((m: ModeName) => setModeState(m), []);

  const value = useMemo(
    () => ({ theme, mode, resolvedMode, setTheme, setMode }),
    [theme, mode, resolvedMode, setTheme, setMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export const THEME_SWATCHES: { name: ThemeName; label: string; hex: string }[] = [
  { name: 'blush', label: 'Blush', hex: '#F49AC1' },
  { name: 'honey', label: 'Honey', hex: '#F5C542' },
  { name: 'lilac', label: 'Lilac', hex: '#ADA4EB' },
  { name: 'sage', label: 'Sage', hex: '#96BD7A' },
  { name: 'sky', label: 'Sky', hex: '#8FBEE8' },
  { name: 'clay', label: 'Clay', hex: '#E29B7A' },
];
