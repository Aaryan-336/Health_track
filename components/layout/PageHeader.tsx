'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Back · title · optional action — the header used on every inner screen. */
export function PageHeader({
  title,
  subtitle,
  action,
  back = true,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  back?: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <header className={cn('mb-5 flex items-start gap-3', className)}>
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-accent/40"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            <path d="M12.5 4L6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <div className="min-w-0 flex-1 pt-0.5">
        <h1 className="font-display text-[1.75rem] leading-[1.15] tracking-[-0.025em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[0.9rem] leading-snug text-muted">{subtitle}</p>}
      </div>

      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </header>
  );
}
