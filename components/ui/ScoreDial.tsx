'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

/**
 * The hero score display — an oversized numeral inside a segmented ring, as in
 * the reference health-score screens. Segments are individually coloured so
 * status never depends on colour alone: the numeral carries the same meaning.
 */

export type DialSegment = {
  key: string;
  label: string;
  ratio: number;
  engaged: boolean;
  colour: string;
};

const HUES: Record<string, string> = {
  water: 'rgb(var(--p-sky))',
  movement: 'rgb(var(--p-clay))',
  habits: 'rgb(var(--p-lilac))',
  nourishment: 'rgb(var(--p-sage))',
  mood: 'rgb(var(--p-blush))',
  connection: 'rgb(var(--p-blush))',
  sharedGoals: 'rgb(var(--p-sage))',
  exchanges: 'rgb(var(--p-honey))',
  commitment: 'rgb(var(--p-lilac))',
};

const SIZE = 260;
const R = 108;
const CENTER = SIZE / 2;
const GAP = 5; // degrees between segments

function arcPath(startDeg: number, endDeg: number) {
  const toXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [CENTER + R * Math.cos(rad), CENTER + R * Math.sin(rad)];
  };
  const [x1, y1] = toXY(startDeg);
  const [x2, y2] = toXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
}

export function ScoreDial({
  score,
  segments,
  caption,
  emptyLabel = 'Log something to begin',
  className,
}: {
  score: number | null;
  segments: DialSegment[];
  caption?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const slice = 360 / Math.max(1, segments.length);

  return (
    <div className={cn('relative mx-auto w-full max-w-[280px]', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full" role="presentation">
        {segments.map((seg, i) => {
          const start = i * slice + GAP / 2;
          const end = (i + 1) * slice - GAP / 2;
          const filledEnd = start + (end - start) * Math.max(0.02, seg.ratio);
          const hue = HUES[seg.key] ?? 'rgb(var(--c-accent))';

          return (
            <g key={seg.key}>
              <path
                d={arcPath(start, end)}
                fill="none"
                stroke="rgb(var(--c-line))"
                strokeWidth="14"
                strokeLinecap="round"
                opacity={0.55}
              />
              {seg.engaged && (
                <motion.path
                  d={arcPath(start, filledEnd)}
                  fill="none"
                  stroke={hue}
                  strokeWidth="14"
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.08, ease: [0.32, 0.72, 0, 1] }}
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {score === null ? (
          <>
            <span className="numeral text-[3.4rem] leading-none text-faint">—</span>
            <span className="mt-2 max-w-[10rem] text-[0.82rem] font-semibold leading-snug text-muted">
              {emptyLabel}
            </span>
          </>
        ) : (
          <>
            <motion.span
              initial={reduce ? false : { scale: 0.86, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
              className="numeral text-[4.2rem] leading-none"
            >
              {(score / 10).toFixed(1)}
            </motion.span>
            {caption && (
              <span className="mt-1 text-[0.8rem] font-semibold text-muted">{caption}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
