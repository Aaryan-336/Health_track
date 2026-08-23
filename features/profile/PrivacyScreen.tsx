'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Empty';
import { PageHeader } from '@/components/layout/PageHeader';
import { Segmented, Toggle } from '@/components/ui/Field';
import { ApiError, patch } from '@/lib/client/api';
import { useUI } from '@/stores/ui';

type Level = 'NONE' | 'STATUS' | 'SUMMARY' | 'DETAIL';

type Category = {
  category: string;
  label: string;
  description: string;
  levels: Level[];
  shareEnabled: boolean;
  detailLevel: Level;
};

const LEVEL_LABEL: Record<Level, string> = {
  NONE: 'Off',
  STATUS: 'A hint',
  SUMMARY: 'A summary',
  DETAIL: 'The details',
};

/** Which group each category belongs to, for a calmer page. */
const GROUPS: { title: string; blurb: string; keys: string[] }[] = [
  {
    title: 'Your day',
    blurb: 'How your health day is going.',
    keys: ['HEALTH_SCORE', 'WATER_TARGET', 'WATER_DETAIL', 'MEALS', 'WORKOUTS', 'HABITS'],
  },
  {
    title: 'How you feel',
    blurb: 'The most personal part. Off unless you say so.',
    keys: ['MOOD_STATUS', 'MOOD_NOTE'],
  },
  { title: 'Momentum', blurb: 'The stuff worth cheering on.', keys: ['STREAKS'] },
];

export function PrivacyScreen({
  categories,
  partnerName,
}: {
  categories: Category[];
  partnerName: string | null;
}) {
  const [state, setState] = useState(categories);
  const [saving, setSaving] = useState<string | null>(null);
  const toast = useUI((s) => s.toast);

  const firstName = partnerName?.split(' ')[0] ?? 'your partner';
  const sharedCount = state.filter((c) => c.shareEnabled).length;

  const push = async (next: Category) => {
    const previous = state;
    setState((current) => current.map((c) => (c.category === next.category ? next : c)));
    setSaving(next.category);
    try {
      await patch('/privacy', {
        updates: [
          {
            category: next.category,
            shareEnabled: next.shareEnabled,
            detailLevel: next.shareEnabled ? next.detailLevel : 'NONE',
          },
        ],
      });
    } catch (error) {
      setState(previous); // rollback — the server is the source of truth
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setSaving(null);
    }
  };

  const toggle = (c: Category, on: boolean) =>
    push({
      ...c,
      shareEnabled: on,
      detailLevel: on ? (c.detailLevel !== 'NONE' ? c.detailLevel : c.levels[0]!) : 'NONE',
    });

  const setLevel = (c: Category, level: Level) => push({ ...c, detailLevel: level });

  return (
    <div>
      <PageHeader
        title="Privacy & sharing"
        subtitle={`Everything is private until you turn it on. ${partnerName ? `${firstName} sees only what is green below.` : 'Nothing is shared while you are on your own.'}`}
      />

      <Card tone="sage" className="mb-5">
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="text-2xl">
            🔒
          </span>
          <div className="min-w-0">
            <p className="font-display text-[1.2rem] leading-tight">
              {sharedCount === 0
                ? 'Nothing is shared right now'
                : `${sharedCount} of ${state.length} shared`}
            </p>
            <p className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">
              This is checked on the server every time, not in the app — turning something off here
              takes it away from {firstName} immediately.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const items = group.keys
            .map((key) => state.find((c) => c.category === key))
            .filter((c): c is Category => Boolean(c));
          if (items.length === 0) return null;

          return (
            <section key={group.title}>
              <h2 className="px-1 font-display text-[1.25rem]">{group.title}</h2>
              <p className="mb-2.5 px-1 text-[0.85rem] text-muted">{group.blurb}</p>

              <div className="space-y-2.5">
                {items.map((c) => (
                  <Card key={c.category} className="px-3 py-2.5">
                    <Toggle
                      checked={c.shareEnabled}
                      disabled={saving === c.category}
                      onChange={(on) => toggle(c, on)}
                      label={
                        <span className="flex items-center gap-2">
                          {c.label}
                          {c.shareEnabled && <Pill tone="sage">{LEVEL_LABEL[c.detailLevel]}</Pill>}
                        </span>
                      }
                      description={c.description}
                    />

                    <AnimatePresence initial={false}>
                      {c.shareEnabled && c.levels.length > 1 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-2 pt-1">
                            <Segmented
                              value={c.detailLevel === 'NONE' ? c.levels[0]! : c.detailLevel}
                              onChange={(level) => setLevel(c, level)}
                              options={c.levels.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-7 px-4 text-center text-[0.8rem] leading-relaxed text-faint">
        Journals are never shared unless you mark an entry as shared when you write it.
      </p>
    </div>
  );
}
