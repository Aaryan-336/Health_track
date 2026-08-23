'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { Field, Input } from '@/components/ui/Field';
import { ApiError, del, patch, post } from '@/lib/client/api';
import { formatInstant } from '@/lib/dates';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type Entry = { id: string; amountMl: number; loggedAt: string };
type Day = { totalMl: number; goalMl: number; glassSizeMl: number; entries: Entry[] };

/** The glass grid from the reference water screen — tap a glass to fill it. */
export function WaterTracker({
  initial,
  firstName,
  timezone,
}: {
  initial: Day;
  firstName: string;
  timezone: string;
}) {
  const [day, setDay] = useState<Day>(initial);
  const [busy, setBusy] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalGlasses, setGoalGlasses] = useState(Math.round(initial.goalMl / initial.glassSizeMl));
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const reduce = useReducedMotion();

  const goalGlassCount = Math.max(1, Math.round(day.goalMl / day.glassSizeMl));
  const filled = Math.floor(day.totalMl / day.glassSizeMl);
  const remaining = Math.max(0, goalGlassCount - filled);
  const pct = Math.min(100, (day.totalMl / day.goalMl) * 100);

  const addGlass = async (amountMl: number) => {
    if (busy) return;
    setBusy(true);
    const before = day;
    setDay({ ...day, totalMl: day.totalMl + amountMl }); // optimistic

    try {
      const res = await post<{ day: Day }>('/water', { amountMl });
      setDay(res.day);
      if (res.day.totalMl >= res.day.goalMl && before.totalMl < before.goalMl) {
        toast('Water goal reached — nicely done', 'success', '💧');
      }
      router.refresh();
    } catch (error) {
      setDay(before); // rollback
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const before = day;
    setDay({
      ...day,
      entries: day.entries.filter((e) => e.id !== id),
      totalMl: day.totalMl - (day.entries.find((e) => e.id === id)?.amountMl ?? 0),
    });

    try {
      await del(`/water/${id}`);
      const fresh = await fetch('/api/v1/water').then((r) => r.json());
      setDay(fresh.data);
      router.refresh();
    } catch (error) {
      setDay(before);
      toast(error instanceof ApiError ? error.message : 'Could not remove that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveGoal = async () => {
    setBusy(true);
    try {
      await patch('/profile', {
        healthProfile: { dailyWaterGoalMl: goalGlasses * day.glassSizeMl },
      });
      setDay({ ...day, goalMl: goalGlasses * day.glassSizeMl });
      setGoalOpen(false);
      toast('Daily goal updated', 'success', '💧');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not update the goal.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Water today" subtitle={`${firstName}, small sips add up.`} />

      <Card tone="sky" className="mb-5 text-center">
        <CardLabel>Today</CardLabel>
        <p className="numeral mt-1 text-[3rem] leading-none">
          {filled}
          <span className="text-[1.6rem] text-muted"> of {goalGlassCount}</span>
        </p>
        <p className="mt-1 text-[0.88rem] text-muted">
          {remaining === 0
            ? 'Goal reached — lovely.'
            : `${remaining} glass${remaining === 1 ? '' : 'es'} to go (${day.totalMl} ml so far)`}
        </p>

        {/* Glass grid */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {Array.from({ length: goalGlassCount }, (_, i) => {
            const isFull = i < filled;
            return (
              <motion.button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => !isFull && addGlass(day.glassSizeMl)}
                whileTap={isFull ? undefined : { scale: 0.88 }}
                aria-label={isFull ? `Glass ${i + 1}, filled` : `Fill glass ${i + 1}`}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-2xl border-2 transition-colors duration-300',
                  isFull
                    ? 'border-transparent bg-sky text-white'
                    : 'border-dashed border-sky/50 bg-surface/60 text-sky hover:border-sky',
                )}
              >
                <motion.span
                  initial={reduce || !isFull ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 20 }}
                  className="text-lg"
                  aria-hidden
                >
                  {isFull ? '💧' : '+'}
                </motion.span>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-5 h-2.5 overflow-hidden rounded-pill bg-surface/70">
          <motion.div
            className="h-full rounded-pill bg-sky"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          />
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {[
          { label: 'Glass', ml: day.glassSizeMl, emoji: '🥛' },
          { label: 'Bottle', ml: 500, emoji: '🍶' },
          { label: 'Large', ml: 750, emoji: '🫗' },
        ].map((q) => (
          <Button key={q.label} variant="soft" onClick={() => addGlass(q.ml)} disabled={busy} className="h-auto flex-col py-3">
            <span className="text-xl" aria-hidden>
              {q.emoji}
            </span>
            <span className="text-[0.78rem]">{q.label}</span>
            <span className="text-[0.7rem] font-semibold opacity-60">{q.ml} ml</span>
          </Button>
        ))}
      </div>

      <Button variant="outline" fullWidth onClick={() => setGoalOpen(true)} className="mb-6">
        Change daily goal
      </Button>

      {day.entries.length > 0 && (
        <section>
          <h2 className="mb-2.5 px-1 font-display text-[1.3rem]">Today&rsquo;s sips</h2>
          <div className="space-y-2">
            {[...day.entries].reverse().map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface px-4 py-3"
              >
                <span aria-hidden className="text-lg">
                  💧
                </span>
                <span className="flex-1 font-bold">{e.amountMl} ml</span>
                <span className="text-[0.82rem] text-muted">
                  {formatInstant(new Date(e.loggedAt), timezone)}
                </span>
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  disabled={busy}
                  aria-label={`Remove ${e.amountMl} ml entry`}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-clay-soft hover:text-ink"
                >
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Sheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title="Daily water goal"
        footer={
          <Button fullWidth size="lg" onClick={saveGoal} loading={busy}>
            Save goal
          </Button>
        }
      >
        <Field label="Glasses a day" hint={`One glass is ${day.glassSizeMl} ml.`}>
          <Input
            type="number"
            min={2}
            max={20}
            value={goalGlasses}
            onChange={(e) => setGoalGlasses(Math.max(2, Math.min(20, Number(e.target.value) || 2)))}
          />
        </Field>
        <p className="mt-3 text-[0.85rem] text-muted">
          That&rsquo;s {goalGlasses * day.glassSizeMl} ml a day.
        </p>
      </Sheet>
    </div>
  );
}
