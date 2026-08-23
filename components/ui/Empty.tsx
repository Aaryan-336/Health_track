import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Empty({
  emoji = '🌤️',
  title,
  body,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line px-6 py-10 text-center',
        className,
      )}
    >
      <span className="mb-3 text-3xl" aria-hidden>
        {emoji}
      </span>
      <p className="font-display text-[1.2rem] leading-tight">{title}</p>
      {body && <p className="mt-1.5 max-w-[22rem] text-[0.9rem] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = 'plain',
  className,
}: {
  children: ReactNode;
  tone?: 'plain' | 'honey' | 'blush' | 'lilac' | 'sage' | 'sky' | 'clay' | 'accent';
  className?: string;
}) {
  const tones = {
    plain: 'bg-raised text-muted border-line',
    honey: 'bg-honey-soft text-ink border-honey/30',
    blush: 'bg-blush-soft text-ink border-blush/30',
    lilac: 'bg-lilac-soft text-ink border-lilac/30',
    sage: 'bg-sage-soft text-ink border-sage/30',
    sky: 'bg-sky-soft text-ink border-sky/30',
    clay: 'bg-clay-soft text-ink border-clay/30',
    accent: 'bg-accent-soft text-accent-ink border-accent/30',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-[0.76rem] font-bold',
        tones,
        className,
      )}
    >
      {children}
    </span>
  );
}
