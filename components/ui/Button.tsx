'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink shadow-lift hover:brightness-[1.04]',
  soft: 'bg-accent-soft text-accent-ink border border-accent/20 hover:brightness-[0.98]',
  ghost: 'bg-transparent text-muted hover:bg-raised hover:text-ink',
  outline: 'bg-surface text-ink border border-line hover:border-accent/40',
  danger: 'bg-blush-soft text-ink border border-blush/40 hover:brightness-[0.98]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-[0.95rem]',
  lg: 'h-14 px-7 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  loading = false,
  icon,
  fullWidth,
  disabled,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
} & Omit<HTMLMotionProps<'button'>, 'children'>) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-pill font-bold',
        'transition-[filter,background-color,border-color,opacity] duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </motion.button>
  );
}
