'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { Sheet } from '@/components/ui/Sheet';
import { useUI } from '@/stores/ui';

/** The central "+" hub — one tap to every kind of entry. */

const ACTIONS = [
  { href: '/track/water', label: 'Water', hint: 'A glass or a bottle', emoji: '💧', tone: 'bg-sky-soft' },
  { href: '/track/meals', label: 'Meal', hint: 'What you ate', emoji: '🥗', tone: 'bg-sage-soft' },
  { href: '/track/workouts', label: 'Movement', hint: 'Walk, gym, dance', emoji: '🏃', tone: 'bg-clay-soft' },
  { href: '/track/mood', label: 'Mood check-in', hint: 'How you feel right now', emoji: '💗', tone: 'bg-blush-soft' },
  { href: '/track/habits', label: 'Habits', hint: 'Tick off today', emoji: '🌱', tone: 'bg-lilac-soft' },
  { href: '/track/journal', label: 'Journal', hint: 'Write it down', emoji: '📖', tone: 'bg-honey-soft' },
  { href: '/goals/new', label: 'New goal', hint: 'For you or the two of you', emoji: '✨', tone: 'bg-accent-soft' },
  { href: '/us/messages/new', label: 'Send a note', hint: 'Something sweet', emoji: '💌', tone: 'bg-blush-soft' },
] as const;

export function AddSheet() {
  const open = useUI((s) => s.addSheetOpen);
  const setOpen = useUI((s) => s.setAddSheet);
  const router = useRouter();

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="What would you like to add?">
      <div className="grid gap-2">
        {ACTIONS.map((a, i) => (
          <motion.button
            key={a.href}
            type="button"
            onClick={() => go(a.href)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 * i, duration: 0.3 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3.5 rounded-2xl border border-line/60 bg-surface p-3 text-left transition-colors hover:border-accent/30"
          >
            <span
              aria-hidden
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${a.tone}`}
            >
              {a.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-tight">{a.label}</span>
              <span className="block text-[0.82rem] text-muted">{a.hint}</span>
            </span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-faint" aria-hidden>
              <path d="M7 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        ))}
      </div>
    </Sheet>
  );
}
