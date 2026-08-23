'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { cn } from '@/lib/cn';
import { post, ApiError } from '@/lib/client/api';
import { useUI } from '@/stores/ui';

const TONES: Record<string, string> = {
  honey: 'bg-honey-soft',
  blush: 'bg-blush-soft',
  lilac: 'bg-lilac-soft',
  sage: 'bg-sage-soft',
  sky: 'bg-sky-soft',
  clay: 'bg-clay-soft',
};

/**
 * Optimistic tick with a real rollback — the row reverts if the server
 * rejects the change, so the UI never lies about what was saved.
 */
export function HabitRow({
  habit,
  streak,
}: {
  habit: { id: string; title: string; colour: string; completedToday: boolean };
  streak?: number;
}) {
  const [done, setDone] = useState(habit.completedToday);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const toggle = async () => {
    if (busy) return;
    const previous = done;
    setDone(!previous);
    setBusy(true);

    try {
      const result = await post<{ completed: boolean }>(`/habits/${habit.id}/complete`, {
        undo: previous,
      });
      setDone(result.completed);
      if (result.completed) toast(`${habit.title} — done`, 'success', '🌱');
      startTransition(() => router.refresh());
    } catch (error) {
      setDone(previous); // rollback
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.985 }}
      aria-pressed={done}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all duration-300',
        done
          ? 'border-transparent bg-sage-soft'
          : 'border-line/70 bg-surface hover:border-accent/30',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-colors duration-300',
          done ? 'bg-sage text-white' : TONES[habit.colour] ?? 'bg-lilac-soft',
        )}
      >
        {done ? (
          <motion.svg
            viewBox="0 0 20 20"
            className="h-5 w-5"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <path
              d="M4.5 10.5l3.5 3.5 7.5-7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        ) : (
          <span className="text-base">🌱</span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-bold leading-tight', done && 'line-through decoration-2 opacity-60')}>
          {habit.title}
        </span>
        {streak !== undefined && streak > 0 && (
          <span className="mt-0.5 block text-[0.78rem] text-muted">🔥 {streak} day streak</span>
        )}
      </span>

      <span
        aria-hidden
        className={cn(
          'h-6 w-6 shrink-0 rounded-full border-2 transition-colors duration-300',
          done ? 'border-sage bg-sage' : 'border-line',
        )}
      />
    </motion.button>
  );
}
