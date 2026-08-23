'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { useTheme } from './ThemeProvider';
import { patch } from '@/lib/client/api';
import { cn } from '@/lib/cn';

/**
 * Sun/moon switch. Flips light ↔ dark immediately, then saves the choice to the
 * account in the background so it follows the user to their other devices.
 */
export function ModeToggle({ className }: { className?: string }) {
  const { resolvedMode, setMode } = useTheme();
  const reduce = useReducedMotion();
  const isDark = resolvedMode === 'dark';

  const flip = () => {
    const next = isDark ? 'light' : 'dark';
    setMode(next);
    // Fire and forget — the UI has already changed and localStorage holds it.
    void patch('/profile', { modePreference: next.toUpperCase() }).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={flip}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full',
        'border border-line bg-surface text-ink shadow-soft',
        'transition-colors duration-300 hover:border-accent/40 active:scale-95',
        className,
      )}
    >
      <motion.span
        key={isDark ? 'moon' : 'sun'}
        initial={reduce ? false : { y: isDark ? 14 : -14, opacity: 0, rotate: isDark ? -40 : 40 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="text-[1.05rem] leading-none"
        aria-hidden
      >
        {isDark ? '🌙' : '☀️'}
      </motion.span>
    </button>
  );
}

/** Three-way control (Light · Dark · System) for the settings screen. */
export function ModeSelector() {
  const { mode, setMode } = useTheme();

  const options = [
    { value: 'light' as const, label: 'Light', emoji: '☀️' },
    { value: 'dark' as const, label: 'Dark', emoji: '🌙' },
    { value: 'system' as const, label: 'Auto', emoji: '✨' },
  ];

  const choose = (next: (typeof options)[number]['value']) => {
    setMode(next);
    void patch('/profile', { modePreference: next.toUpperCase() }).catch(() => {});
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={mode === o.value}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3.5 transition-all duration-200',
            mode === o.value
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-surface hover:border-accent/30',
          )}
        >
          <span className="text-xl" aria-hidden>
            {o.emoji}
          </span>
          <span className="text-[0.78rem] font-bold">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
