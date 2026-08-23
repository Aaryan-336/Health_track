'use client';

import { BACKGROUND_LIST } from '@/lib/backgrounds';
import { cn } from '@/lib/cn';

/** Choose the mood a note arrives in. */
export function BackgroundPicker({
  value,
  onChange,
  label = 'Pick a mood',
}: {
  value: string;
  onChange: (key: string) => void;
  label?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {BACKGROUND_LIST.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => onChange(b.key)}
            aria-pressed={value === b.key}
            aria-label={b.label}
            className={cn(
              'flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition-all duration-200',
              value === b.key ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100',
            )}
          >
            <span
              aria-hidden
              className="grid h-14 w-14 place-items-center rounded-blob text-lg shadow-soft"
              style={{ background: b.gradient }}
            >
              {b.emoji}
            </span>
            <span className="text-[0.68rem] font-bold">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
