'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, del, post } from '@/lib/client/api';
import { formatLocalDate } from '@/lib/dates';
import { useCelebration } from '@/stores/celebration';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';
import { GOAL_CATEGORY_META } from './categories';

type Milestone = { id: string; label: string; thresholdPct: number; reached: boolean };
type Participant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  acceptanceStatus: string;
};
type Contribution = {
  id: string;
  value: number;
  note: string | null;
  sourceType: string;
  contributedAt: string;
  user: { id: string; displayName: string; avatarUrl: string | null };
};

type Goal = {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  category: keyof typeof GOAL_CATEGORY_META;
  goalType: 'INDIVIDUAL' | 'SHARED';
  status: string;
  unit: string;
  currentValue: number;
  targetValue: number;
  percent: number;
  progressMode: string;
  deadline: string | null;
  completedAt: string | null;
  milestones: Milestone[];
  participants: Participant[];
};

const fmt = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1));

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'added by hand',
  WATER: 'from water logs',
  ACTIVITY: 'from movement logs',
  HABIT: 'from habits',
  MEAL: 'from meals',
  MOOD: 'from check-ins',
  CHECK_IN: 'from check-ins',
};

export function GoalDetail({
  goal: initial,
  contributions: initialContributions,
  viewerId,
  canContribute,
  isCreator,
}: {
  goal: Goal;
  contributions: Contribution[];
  viewerId: string;
  canContribute: boolean;
  isCreator: boolean;
}) {
  const [goal, setGoal] = useState(initial);
  const [contributions, setContributions] = useState(initialContributions);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState('');

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const celebrate = useCelebration((s) => s.celebrate);

  const meta = GOAL_CATEGORY_META[goal.category];
  const done = goal.status === 'COMPLETED';
  const remaining = Math.max(0, goal.targetValue - goal.currentValue);

  const addProgress = async () => {
    if (amount === 0) return;
    setBusy(true);
    try {
      const res = await post<{
        outcome: {
          currentValue: number;
          completed: boolean;
          milestonesReached: { label: string; thresholdPct: number }[];
        };
        goal: { status: string; currentValue: number };
      }>(`/goals/${goal.id}/progress`, { value: amount, note: note.trim() || undefined });

      const nextValue = res.outcome.currentValue;
      setGoal((g) => ({
        ...g,
        currentValue: nextValue,
        percent: Math.min(100, Math.round((nextValue / g.targetValue) * 100)),
        status: res.outcome.completed ? 'COMPLETED' : g.status,
        milestones: g.milestones.map((m) =>
          res.outcome.milestonesReached.some((r) => r.thresholdPct === m.thresholdPct)
            ? { ...m, reached: true }
            : m,
        ),
      }));

      setOpen(false);
      setNote('');
      setAmount(1);

      if (res.outcome.completed) {
        celebrate({
          title: `${goal.title} — done!`,
          body:
            goal.goalType === 'SHARED'
              ? 'You reached this one together. That is worth a moment.'
              : 'You saw it through. Take the win.',
          emoji: goal.emoji || '🎉',
        });
      } else if (res.outcome.milestonesReached.length) {
        const top = res.outcome.milestonesReached[res.outcome.milestonesReached.length - 1]!;
        toast(`${top.thresholdPct}% — ${top.label}`, 'success', '🌱');
      } else {
        toast('Progress added', 'success', goal.emoji);
      }

      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not add that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeGoal = async () => {
    setBusy(true);
    try {
      await del(`/goals/${goal.id}`);
      toast('Goal removed', 'info', '🗑️');
      router.push('/goals');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not remove that.', 'error');
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={
          <span>
            <span aria-hidden className="mr-2">
              {goal.emoji}
            </span>
            {goal.title}
          </span>
        }
        subtitle={goal.description ?? undefined}
      />

      {/* ── Progress ─────────────────────────────────────────────────────── */}
      <Card tone={done ? 'sage' : (meta.colour as 'honey')} className="mb-5 text-center">
        <CardLabel>{done ? 'Complete' : 'Progress'}</CardLabel>

        <p className="numeral mt-2 text-[3.4rem] leading-none">
          {goal.percent}
          <span className="text-[1.6rem] text-muted">%</span>
        </p>

        <p className="mt-1 text-[0.92rem] font-bold">
          {fmt(goal.currentValue)} of {fmt(goal.targetValue)} {goal.unit}
        </p>

        {!done && (
          <p className="mt-0.5 text-[0.85rem] text-muted">
            {fmt(remaining)} {goal.unit} to go
          </p>
        )}

        {/* Milestone track — dots mark thresholds, not just colour. */}
        <div className="relative mt-6 h-3">
          <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 overflow-hidden rounded-pill bg-surface/70">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goal.percent}%` }}
              transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
              className={cn('h-full rounded-pill', done ? 'bg-sage' : 'bg-accent')}
            />
          </div>
          {goal.milestones.map((m) => (
            <span
              key={m.id}
              title={`${m.thresholdPct}% · ${m.label}`}
              style={{ left: `${m.thresholdPct}%` }}
              className={cn(
                'absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors',
                m.reached ? 'border-surface bg-ink' : 'border-surface bg-line',
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          <Pill tone={meta.colour as 'honey'}>
            {meta.emoji} {meta.label}
          </Pill>
          {goal.goalType === 'SHARED' && <Pill tone="blush">together</Pill>}
          {goal.progressMode === 'AUTO_TRACKED' && <Pill tone="sky">counts automatically</Pill>}
          {goal.deadline && (
            <Pill>by {formatLocalDate(goal.deadline.slice(0, 10), 'd MMM')}</Pill>
          )}
        </div>
      </Card>

      {/* ── Who's on it ──────────────────────────────────────────────────── */}
      {goal.goalType === 'SHARED' && (
        <Card className="mb-5">
          <CardLabel>Working on this</CardLabel>
          <div className="mt-3 flex flex-wrap gap-3">
            {goal.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5">
                <Avatar name={p.displayName} src={p.avatarUrl} size="sm" />
                <div>
                  <p className="text-[0.88rem] font-bold leading-tight">
                    {p.id === viewerId ? 'You' : p.displayName}
                  </p>
                  <p className="text-[0.74rem] text-muted">
                    {p.acceptanceStatus === 'ACCEPTED' ? 'on board' : 'not yet accepted'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Add progress ─────────────────────────────────────────────────── */}
      {!done && canContribute && (
        <div className="mb-6 space-y-2.5">
          {goal.progressMode === 'AUTO_TRACKED' && (
            <p className="px-1 text-[0.84rem] leading-snug text-muted">
              This one fills up on its own from what you log — but you can still add to it by hand.
            </p>
          )}
          <div className="flex gap-2.5">
            {[1, 2, 5].map((n) => (
              <Button
                key={n}
                variant="soft"
                className="flex-1"
                disabled={busy}
                onClick={() => {
                  setAmount(n);
                  setOpen(true);
                }}
              >
                +{n}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setOpen(true)} disabled={busy}>
              Other
            </Button>
          </div>
        </div>
      )}

      {done && (
        <Card tone="sage" className="mb-6 text-center">
          <span className="text-3xl" aria-hidden>
            🎉
          </span>
          <p className="mt-2 font-display text-[1.3rem]">Finished</p>
          {goal.completedAt && (
            <p className="mt-1 text-[0.85rem] text-muted">
              Completed {formatLocalDate(goal.completedAt.slice(0, 10), 'd MMMM yyyy')}
            </p>
          )}
        </Card>
      )}

      {/* ── Milestones ───────────────────────────────────────────────────── */}
      {goal.milestones.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 px-1 font-display text-[1.3rem]">Milestones</h2>
          <div className="space-y-2">
            {goal.milestones.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3.5 transition-colors',
                  m.reached ? 'border-transparent bg-sage-soft' : 'border-line/70 bg-surface',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold',
                    m.reached ? 'bg-sage text-white' : 'bg-raised text-muted',
                  )}
                >
                  {m.reached ? '✓' : `${m.thresholdPct}`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-bold leading-tight', m.reached && 'opacity-70')}>
                    {m.label}
                  </p>
                  <p className="text-[0.78rem] text-muted">
                    at {m.thresholdPct}% · {fmt((goal.targetValue * m.thresholdPct) / 100)} {goal.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── History ──────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-2.5 px-1 font-display text-[1.3rem]">Along the way</h2>
        {contributions.length === 0 ? (
          <Empty emoji="🌱" title="Nothing logged yet" body="Progress you add will show up here." />
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {contributions.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3.5"
                >
                  <Avatar name={c.user.displayName} src={c.user.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9rem] font-bold leading-tight">
                      {c.user.id === viewerId ? 'You' : c.user.displayName} added {fmt(c.value)}{' '}
                      {goal.unit}
                    </p>
                    {c.note && <p className="mt-0.5 text-[0.82rem] italic text-muted">{c.note}</p>}
                    <p className="mt-0.5 text-[0.74rem] text-faint">
                      {formatLocalDate(c.contributedAt.slice(0, 10), 'd MMM')} ·{' '}
                      {SOURCE_LABEL[c.sourceType] ?? 'added'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {isCreator && (
        <Button variant="danger" fullWidth onClick={removeGoal} disabled={busy}>
          Remove this goal
        </Button>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add progress"
        footer={
          <Button fullWidth size="lg" onClick={addProgress} loading={busy} disabled={amount === 0}>
            Add {fmt(amount)} {goal.unit}
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label={`How many ${goal.unit}?`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAmount((a) => Math.max(-999, a - 1))}
                aria-label="Decrease"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-raised text-xl font-bold active:scale-95"
              >
                −
              </button>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="text-center text-lg"
              />
              <button
                type="button"
                onClick={() => setAmount((a) => a + 1)}
                aria-label="Increase"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-raised text-xl font-bold active:scale-95"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="A note (optional)" hint="What was it? Where did you go?">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Picnic in the park"
              maxLength={200}
              className="min-h-[5rem]"
            />
          </Field>

          <p className="text-[0.84rem] text-muted">
            This will take you to{' '}
            <span className="font-bold text-ink">
              {fmt(Math.max(0, goal.currentValue + amount))} of {fmt(goal.targetValue)} {goal.unit}
            </span>
            .
          </p>
        </div>
      </Sheet>
    </div>
  );
}
