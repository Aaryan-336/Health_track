'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The organic "daily highlights" cluster from the reference boards: soft,
 * irregular shapes rather than a uniform grid of cards, so the dashboard keeps
 * an editorial, hand-composed feel.
 */

const SHAPES = [
  '46% 54% 62% 38% / 52% 44% 56% 48%',
  '58% 42% 40% 60% / 45% 58% 42% 55%',
  '38% 62% 55% 45% / 60% 38% 62% 40%',
  '52% 48% 36% 64% / 40% 56% 44% 60%',
  '63% 37% 52% 48% / 48% 62% 38% 52%',
];

const TONES: Record<string, string> = {
  honey: 'bg-honey-soft text-ink',
  blush: 'bg-blush-soft text-ink',
  lilac: 'bg-lilac-soft text-ink',
  sage: 'bg-sage-soft text-ink',
  sky: 'bg-sky-soft text-ink',
  clay: 'bg-clay-soft text-ink',
};

export function Blob({
  tone = 'lilac',
  shape = 0,
  size = 'md',
  className,
  children,
  onClick,
  label,
  drift = true,
}: {
  tone?: keyof typeof TONES;
  shape?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  label?: string;
  drift?: boolean;
}) {
  const reduce = useReducedMotion();
  const Comp = onClick ? motion.button : motion.div;

  const dims = { sm: 'h-24 w-24', md: 'h-[6.75rem] w-[6.75rem]', lg: 'h-32 w-32' }[size];

  return (
    <Comp
      onClick={onClick}
      aria-label={label}
      type={onClick ? 'button' : undefined}
      whileTap={onClick ? { scale: 0.94 } : undefined}
      animate={
        drift && !reduce
          ? { borderRadius: [SHAPES[shape % 5]!, SHAPES[(shape + 1) % 5]!, SHAPES[shape % 5]!] }
          : undefined
      }
      transition={{ duration: 14 + (shape % 3) * 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{ borderRadius: SHAPES[shape % 5] }}
      className={cn(
        'flex shrink-0 flex-col items-center justify-center gap-0.5 p-3 text-center shadow-soft',
        'transition-shadow duration-300',
        onClick && 'cursor-pointer hover:shadow-lift',
        TONES[tone],
        dims,
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/** A single highlight in the cluster: value over a small label. */
export function HighlightBlob({
  tone,
  shape,
  value,
  label,
  emoji,
  onClick,
  size,
}: {
  tone: keyof typeof TONES;
  shape: number;
  value: string;
  label: string;
  emoji?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <Blob tone={tone} shape={shape} onClick={onClick} label={`${label}: ${value}`} size={size}>
      {emoji && <span className="text-lg leading-none">{emoji}</span>}
      <span className="numeral text-[1.15rem] leading-tight">{value}</span>
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.08em] opacity-70">
        {label}
      </span>
    </Blob>
  );
}

/** Decorative background wash — kept subtle so it never competes with content. */
export function BlobBackdrop({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <motion.div
        animate={reduce ? undefined : { x: [0, 18, 0], y: [0, -14, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-16 -top-20 h-56 w-56 rounded-blob bg-blush/25 blur-3xl"
      />
      <motion.div
        animate={reduce ? undefined : { x: [0, -20, 0], y: [0, 16, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-20 top-24 h-64 w-64 rounded-blob bg-lilac/25 blur-3xl"
      />
      <motion.div
        animate={reduce ? undefined : { x: [0, 14, 0], y: [0, 20, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-24 left-10 h-56 w-56 rounded-blob bg-honey/20 blur-3xl"
      />
    </div>
  );
}
