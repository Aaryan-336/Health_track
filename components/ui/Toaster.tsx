'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-safe-sm"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            type="button"
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-pill px-4 py-3 text-left',
              'shadow-float backdrop-blur-md',
              t.tone === 'error'
                ? 'bg-clay-soft text-ink'
                : t.tone === 'info'
                  ? 'bg-sky-soft text-ink'
                  : 'bg-sage-soft text-ink',
            )}
          >
            <span aria-hidden className="text-base">
              {t.emoji ?? (t.tone === 'error' ? '💭' : t.tone === 'info' ? '💡' : '✨')}
            </span>
            <span className="text-[0.88rem] font-bold leading-snug">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
