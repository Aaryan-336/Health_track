'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { formatLocalDate } from '@/lib/dates';

/** The Mon–Sun date rail from the reference home screen. */
export function WeekStrip({
  days,
  selected,
  onSelect,
  className,
}: {
  days: { localDate: string; done?: boolean; score?: number | null }[];
  selected: string;
  onSelect?: (localDate: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-stretch justify-between gap-1.5', className)}>
      {days.map((day) => {
        const active = day.localDate === selected;
        const dow = formatLocalDate(day.localDate, 'EEEEE');
        const dom = formatLocalDate(day.localDate, 'd');

        return (
          <button
            key={day.localDate}
            type="button"
            onClick={() => onSelect?.(day.localDate)}
            disabled={!onSelect}
            aria-current={active ? 'date' : undefined}
            aria-label={formatLocalDate(day.localDate, 'EEEE d MMMM')}
            className={cn(
              'group relative flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-2 transition-colors',
              onSelect && 'hover:bg-raised',
            )}
          >
            <span
              className={cn(
                'text-[0.68rem] font-bold uppercase tracking-wider',
                active ? 'text-ink' : 'text-faint',
              )}
            >
              {dow}
            </span>

            <span className="relative grid h-9 w-9 place-items-center">
              {active && (
                <motion.span
                  layoutId="week-dot"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-accent"
                />
              )}
              <span
                className={cn(
                  'relative text-[0.92rem] font-bold tabular-nums',
                  active ? 'text-accent-ink' : 'text-muted',
                )}
              >
                {dom}
              </span>
            </span>

            {/* A dot, not just colour, marks a logged day. */}
            <span
              aria-hidden
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                day.done ? 'bg-sage' : 'bg-transparent',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
