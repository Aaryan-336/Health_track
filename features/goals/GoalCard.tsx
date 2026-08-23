'use client';

import Link from 'next/link';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Empty';
import { ProgressBar } from '@/components/ui/Progress';
import { GOAL_CATEGORY_META } from './categories';

/** Explicit map — Tailwind only emits classes it can see as literal strings. */
const TONE_BG: Record<string, string> = {
  honey: 'bg-honey-soft',
  blush: 'bg-blush-soft',
  lilac: 'bg-lilac-soft',
  sage: 'bg-sage-soft',
  sky: 'bg-sky-soft',
  clay: 'bg-clay-soft',
};

export type GoalSummary = {
  id: string;
  title: string;
  emoji: string;
  category: keyof typeof GOAL_CATEGORY_META;
  goalType: 'INDIVIDUAL' | 'SHARED';
  status: string;
  unit: string;
  currentValue: number;
  targetValue: number;
  percent: number;
  deadline: string | null;
  participants: { id: string; displayName: string; avatarUrl: string | null }[];
};

const fmt = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1));

export function GoalCard({ goal }: { goal: GoalSummary }) {
  const meta = GOAL_CATEGORY_META[goal.category];
  const done = goal.status === 'COMPLETED';

  return (
    <Link href={`/goals/${goal.id}`} className="block">
      <Card
        tone={done ? 'sage' : 'plain'}
        className="transition-shadow duration-300 hover:shadow-lift"
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl ${TONE_BG[meta.colour]}`}
          >
            {goal.emoji}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate font-display text-[1.2rem] leading-tight">
                {goal.title}
              </p>
              {goal.goalType === 'SHARED' && (
                <div className="flex -space-x-2">
                  {goal.participants.slice(0, 2).map((p) => (
                    <Avatar key={p.id} name={p.displayName} src={p.avatarUrl} size="xs" className="ring-2 ring-surface" />
                  ))}
                </div>
              )}
            </div>

            <p className="mt-0.5 text-[0.82rem] text-muted">
              {fmt(goal.currentValue)} of {fmt(goal.targetValue)} {goal.unit}
            </p>

            <ProgressBar
              value={goal.percent}
              className="mt-2.5"
              tone={done ? 'sage' : goal.goalType === 'SHARED' ? 'blush' : 'accent'}
            />

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Pill tone={meta.colour as 'honey'}>
                {meta.emoji} {meta.label}
              </Pill>
              {goal.goalType === 'SHARED' && <Pill tone="blush">together</Pill>}
              {done && <Pill tone="sage">✓ complete</Pill>}
              <span className="ml-auto numeral text-[0.9rem] font-bold">{goal.percent}%</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
