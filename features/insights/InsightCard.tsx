'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { post } from '@/lib/client/api';

/**
 * Personalised insight. It always carries the "not medical advice" framing —
 * these are observations about logged data, nothing more.
 */
export function InsightCard({
  insight,
}: {
  insight: { id: string; title: string; body: string; insightType: string };
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const dismiss = async () => {
    setDismissed(true);
    try {
      await post(`/insights/${insight.id}/dismiss`);
    } catch {
      /* dismissing is cosmetic; it will reappear on next load if it failed */
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card tone="honey" className="relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this insight"
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex gap-3 pr-6">
          <span aria-hidden className="text-2xl">
            {insight.insightType === 'GENTLE_NUDGE' ? '🌤️' : insight.insightType === 'PATTERN' ? '🔍' : '✨'}
          </span>
          <div className="min-w-0">
            <p className="font-display text-[1.15rem] leading-tight">{insight.title}</p>
            <p className="mt-1 text-[0.9rem] leading-relaxed text-muted">{insight.body}</p>
            <p className="mt-2.5 text-[0.72rem] leading-snug text-faint">
              An observation from what you logged — not medical advice.
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
