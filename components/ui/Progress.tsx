'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

const TONES: Record<string, string> = {
  honey: 'bg-honey',
  blush: 'bg-blush',
  lilac: 'bg-lilac',
  sage: 'bg-sage',
  sky: 'bg-sky',
  clay: 'bg-clay',
  accent: 'bg-accent',
};

export function ProgressBar({
  value,
  tone = 'accent',
  className,
  height = 'md',
}: {
  value: number; // 0..100
  tone?: keyof typeof TONES;
  className?: string;
  height?: 'sm' | 'md' | 'lg';
}) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));
  const h = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }[height];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('w-full overflow-hidden rounded-pill bg-line/70', h, className)}
    >
      <motion.div
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        className={cn('h-full rounded-pill', TONES[tone])}
      />
    </div>
  );
}

/** Compact ring used on goal cards and habit tiles. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 5,
  tone = 'accent',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: keyof typeof TONES;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  const hue: Record<string, string> = {
    honey: 'rgb(var(--p-honey))',
    blush: 'rgb(var(--p-blush))',
    lilac: 'rgb(var(--p-lilac))',
    sage: 'rgb(var(--p-sage))',
    sky: 'rgb(var(--p-sky))',
    clay: 'rgb(var(--p-clay))',
    accent: 'rgb(var(--c-accent))',
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-line))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hue[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-bold">
          {children}
        </div>
      )}
    </div>
  );
}
