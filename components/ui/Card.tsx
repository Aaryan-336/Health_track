import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'plain' | 'honey' | 'blush' | 'lilac' | 'sage' | 'sky' | 'clay' | 'accent';

const TONES: Record<Tone, string> = {
  plain: 'bg-surface border-line/60',
  honey: 'bg-honey-soft border-honey/25',
  blush: 'bg-blush-soft border-blush/25',
  lilac: 'bg-lilac-soft border-lilac/25',
  sage: 'bg-sage-soft border-sage/25',
  sky: 'bg-sky-soft border-sky/25',
  clay: 'bg-clay-soft border-clay/25',
  accent: 'bg-accent-soft border-accent/25',
};

export function Card({
  tone = 'plain',
  className,
  children,
  padded = true,
  ...rest
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  padded?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border shadow-soft',
        TONES[tone],
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('font-display text-[1.35rem] leading-tight tracking-[-0.02em]', className)}>
      {children}
    </h2>
  );
}

export function CardLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted', className)}>
      {children}
    </p>
  );
}

/** Section heading with an optional trailing action, as used across the app. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3 px-1', className)}>
      <h2 className="font-display text-[1.4rem] leading-none tracking-[-0.02em]">{title}</h2>
      {action}
    </div>
  );
}
