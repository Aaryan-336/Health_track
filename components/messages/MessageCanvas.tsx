'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

import { resolveBackground } from '@/lib/backgrounds';

/**
 * The full-screen canvas a note or letter is read on.
 *
 * The operating system owns how the tray notification looks, so this is where
 * the app gets to be itself: a warm gradient, drifting motes and an unhurried
 * reveal. Every layer is decorative and hidden from assistive tech — the text
 * on top is the content.
 */
export function MessageCanvas({
  background,
  children,
  className,
}: {
  background: string | null | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  const bg = resolveBackground(background);
  const reduce = useReducedMotion();

  // Deterministic positions so the motes don't reshuffle on every render.
  const motes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: (i * 37 + 11) % 96,
        top: (i * 53 + 7) % 88,
        size: 4 + ((i * 7) % 10),
        delay: (i % 7) * 0.7,
        duration: 9 + ((i * 3) % 8),
      })),
    [],
  );

  return (
    <div
      className={`relative min-h-dvh overflow-hidden ${className ?? ''}`}
      style={{ background: bg.gradient, color: bg.ink }}
    >
      {/* Drifting motes */}
      {!reduce && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {motes.map((m) => (
            <motion.span
              key={m.id}
              className="absolute rounded-full"
              style={{
                left: `${m.left}%`,
                top: `${m.top}%`,
                width: m.size,
                height: m.size,
                background: bg.motes,
                opacity: 0.35,
              }}
              animate={{
                y: [0, -22, 0],
                x: [0, 10, 0],
                opacity: [0.18, 0.5, 0.18],
                scale: [1, 1.25, 1],
              }}
              transition={{
                duration: m.duration,
                delay: m.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Soft vignette to keep long text comfortable to read */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% 40%, rgba(255,255,255,0.28) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
