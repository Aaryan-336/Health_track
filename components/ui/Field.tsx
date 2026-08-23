'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 block text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1.5 block text-[0.82rem] font-semibold text-clay">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[0.82rem] text-faint">{hint}</span>
      ) : null}
    </label>
  );
}

const base =
  'w-full rounded-2xl border border-line bg-raised px-4 text-ink placeholder:text-faint ' +
  'transition-colors duration-200 focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15';

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-13 py-3.5', className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'min-h-[7rem] resize-none py-3.5 leading-relaxed', className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(base, 'h-13 appearance-none py-3.5 pr-10', className)}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      >
        <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors',
        'hover:bg-raised disabled:opacity-50',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[0.84rem] leading-snug text-muted">{description}</span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-pill transition-colors duration-300',
          checked ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow-soft transition-all duration-300 ease-bounce',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('flex gap-1 rounded-pill border border-line bg-raised p-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-pill px-3 py-2 text-[0.86rem] font-bold transition-all duration-200',
              active ? 'bg-accent text-accent-ink shadow-soft' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
