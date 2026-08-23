'use client';

import { motion } from 'framer-motion';

import { Card } from '@/components/ui/Card';
import { ModeSelector } from '@/components/layout/ModeToggle';
import { PageHeader } from '@/components/layout/PageHeader';
import { THEME_SWATCHES, useTheme } from '@/components/layout/ThemeProvider';
import { patch } from '@/lib/client/api';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

/** Colour and light. Both choices apply instantly, then save to the account. */
export function AppearanceScreen() {
  const { theme, setTheme } = useTheme();
  const toast = useUI((s) => s.toast);

  const choose = (next: (typeof THEME_SWATCHES)[number]) => {
    setTheme(next.name);
    void patch('/profile', { themePreference: next.name.toUpperCase() }).catch(() =>
      toast('Saved on this device only.', 'info'),
    );
  };

  return (
    <div>
      <PageHeader title="Look & feel" subtitle="Pick the colour you want to open every morning." />

      <section className="mb-7">
        <h2 className="mb-3 px-1 font-display text-[1.25rem]">Your colour</h2>
        <div className="grid grid-cols-3 gap-3">
          {THEME_SWATCHES.map((swatch) => {
            const active = theme === swatch.name;
            return (
              <motion.button
                key={swatch.name}
                type="button"
                onClick={() => choose(swatch)}
                whileTap={{ scale: 0.96 }}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center gap-2.5 rounded-card border-2 py-4 transition-all duration-200',
                  active ? 'border-accent bg-accent-soft shadow-soft' : 'border-line bg-surface',
                )}
              >
                <span
                  aria-hidden
                  className="h-10 w-10 rounded-blob shadow-soft"
                  style={{ background: swatch.hex }}
                />
                <span className="text-[0.8rem] font-bold">{swatch.label}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="mb-7">
        <h2 className="mb-3 px-1 font-display text-[1.25rem]">Light or dark</h2>
        <ModeSelector />
        <p className="mt-2.5 px-1 text-[0.84rem] leading-relaxed text-muted">
          Auto follows your phone, so Bloom dims when everything else does.
        </p>
      </section>

      <Card tone="accent">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-muted">Preview</p>
        <p className="mt-2 font-display text-[1.6rem] leading-tight">Good evening, you</p>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">
          This is how a card looks in the colour and light you just chose.
        </p>
        <div className="mt-4 flex gap-2">
          <span className="rounded-pill bg-accent px-4 py-2 text-[0.82rem] font-bold text-accent-ink">
            A button
          </span>
          <span className="rounded-pill border border-line bg-surface px-4 py-2 text-[0.82rem] font-bold">
            And another
          </span>
        </div>
      </Card>
    </div>
  );
}
