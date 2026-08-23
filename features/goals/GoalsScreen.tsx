'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { PageHeader } from '@/components/layout/PageHeader';
import { Segmented } from '@/components/ui/Field';
import { GoalCard, type GoalSummary } from './GoalCard';
import { GOAL_CATEGORY_META } from './categories';

type Filter = 'all' | 'mine' | 'shared' | 'done';

export function GoalsScreen({ goals }: { goals: GoalSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const active = goals.filter((g) => g.status === 'ACTIVE');
    if (filter === 'done') return goals.filter((g) => g.status === 'COMPLETED');
    if (filter === 'mine') return active.filter((g) => g.goalType === 'INDIVIDUAL');
    if (filter === 'shared') return active.filter((g) => g.goalType === 'SHARED');
    return active;
  }, [goals, filter]);

  const grouped = useMemo(() => {
    const byGroup = { health: [] as GoalSummary[], relationship: [] as GoalSummary[] };
    for (const g of visible) byGroup[GOAL_CATEGORY_META[g.category].group].push(g);
    return byGroup;
  }, [visible]);

  const activeCount = goals.filter((g) => g.status === 'ACTIVE').length;
  const doneCount = goals.filter((g) => g.status === 'COMPLETED').length;

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle={`${activeCount} on the go · ${doneCount} finished`}
        back={false}
        action={
          <Link
            href="/goals/new"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink shadow-soft"
            aria-label="Create a goal"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </Link>
        }
      />

      <Segmented
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'mine', label: 'Mine' },
          { value: 'shared', label: 'Ours' },
          { value: 'done', label: 'Done' },
        ]}
      />

      {visible.length === 0 ? (
        <Empty
          emoji="✨"
          title={filter === 'done' ? 'Nothing finished yet' : 'No goals here yet'}
          body={
            filter === 'shared'
              ? 'Shared goals are ones you and your partner work towards together.'
              : 'Set something you want to move towards — big or small.'
          }
          action={
            filter !== 'done' && (
              <Link
                href="/goals/new"
                className="inline-flex h-11 items-center rounded-pill bg-accent px-5 font-bold text-accent-ink"
              >
                Create a goal
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {(['health', 'relationship'] as const).map((group) =>
              grouped[group].length === 0 ? null : (
                <motion.section
                  key={group}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <h2 className="mb-2.5 px-1 font-display text-[1.3rem]">
                    {group === 'health' ? 'Health & wellbeing' : 'The two of you'}
                  </h2>
                  <div className="space-y-2.5">
                    {grouped[group].map((g) => (
                      <GoalCard key={g.id} goal={g} />
                    ))}
                  </div>
                </motion.section>
              ),
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
