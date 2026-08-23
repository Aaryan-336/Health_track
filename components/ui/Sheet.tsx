'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Bottom sheet — the app's primary modal surface on mobile. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Dialog'}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-canvas shadow-float',
              'rounded-t-[2rem] sm:max-w-md sm:rounded-[2rem]',
              className,
            )}
          >
            <div className="shrink-0 px-5 pb-2 pt-3">
              <div aria-hidden className="mx-auto h-1.5 w-10 rounded-pill bg-line sm:hidden" />
              {title && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <h2 className="font-display text-[1.5rem] leading-tight tracking-[-0.02em]">
                    {title}
                  </h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-muted transition-colors hover:text-ink"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4">
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-line/70 bg-surface px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
