'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, post } from '@/lib/client/api';
import { formatLocalDate } from '@/lib/dates';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type Entry = {
  id: string;
  activityType: string;
  durationMinutes: number;
  intensity: number;
  note: string | null;
  localDate: string;
  loggedAt: string;
};

const PRESETS = ['Walk', 'Run', 'Yoga', 'Gym', 'Cycling', 'Swim', 'Dance', 'Stretch'];
const INTENSITY = ['Gentle', 'Steady', 'Strong'];

export function WorkoutTracker({
  initial,
  dailyGoal,
  weeklyGoal,
  today,
  week,
  timezone,
}: {
  initial: Entry[];
  dailyGoal: number;
  weeklyGoal: number;
  today: string;
  week: { localDate: string; minutes: number }[];
  timezone: string;
}) {
  const [entries, setEntries] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activityType, setActivityType] = useState('Walk');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(2);
  const [note, setNote] = useState('');
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  void timezone;

  const todayMinutes = entries
    .filter((e) => e.localDate === today)
    .reduce((s, e) => s + e.durationMinutes, 0);
  const sessionsThisWeek = new Set(entries.map((e) => e.localDate)).size;
  const peak = Math.max(dailyGoal, ...week.map((d) => d.minutes), 1);

  const save = async () => {
    if (!activityType.trim() || duration < 1) return;
    setBusy(true);
    try {
      const res = await post<{ entry: Entry }>('/workouts', {
        activityType: activityType.trim(),
        durationMinutes: duration,
        intensity,
        note: note.trim() || undefined,
      });
      setEntries((prev) => [res.entry, ...prev]);
      setNote('');
      setOpen(false);
      toast(`${duration} minutes logged`, 'success', '🏃');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Movement"
        subtitle="However you moved counts."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            Add
          </Button>
        }
      />

      <Card tone="clay" className="mb-5">
        <CardLabel>Today</CardLabel>
        <p className="numeral mt-1 text-[2.6rem] leading-none">
          {todayMinutes}
          <span className="text-[1.3rem] text-muted"> / {dailyGoal} min</span>
        </p>

        {/* Weekly bars — the reference summary chart, kept plain and readable. */}
        <div className="mt-5 flex h-24 items-end justify-between gap-1.5">
          {week.map((d) => {
            const h = Math.max(4, (d.minutes / peak) * 100);
            const isToday = d.localDate === today;
            return (
              <div key={d.localDate} className="flex flex-1 flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                  className={cn(
                    'w-full rounded-pill',
                    d.minutes === 0 ? 'bg-surface/70' : isToday ? 'bg-clay' : 'bg-clay/55',
                  )}
                  title={`${d.minutes} min`}
                />
                <span
                  className={cn(
                    'text-[0.62rem] font-bold uppercase',
                    isToday ? 'text-ink' : 'text-muted',
                  )}
                >
                  {formatLocalDate(d.localDate, 'EEEEE')}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[0.84rem] text-muted">
          {sessionsThisWeek} of {weeklyGoal} days moved this week
        </p>
      </Card>

      {entries.length === 0 ? (
        <Empty
          emoji="🏃"
          title="Nothing yet this week"
          body="A ten-minute walk absolutely counts."
          action={<Button onClick={() => setOpen(true)}>Log movement</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {entries.map((e) => (
            <Card key={e.id} className="flex items-center gap-3.5 p-4">
              <span aria-hidden className="text-2xl">
                🏃
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold leading-tight">{e.activityType}</p>
                <p className="mt-0.5 text-[0.8rem] text-muted">
                  {e.durationMinutes} min · {formatLocalDate(e.localDate, 'EEE d MMM')}
                </p>
                {e.note && <p className="mt-1 text-[0.82rem] italic text-muted">{e.note}</p>}
              </div>
              <Pill tone="clay">{INTENSITY[e.intensity - 1]}</Pill>
            </Card>
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="How did you move?"
        footer={
          <Button fullWidth size="lg" onClick={save} loading={busy}>
            Log it
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Activity
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActivityType(p)}
                  aria-pressed={activityType === p}
                  className={`rounded-pill border px-3.5 py-2 text-[0.84rem] font-bold transition-colors ${
                    activityType === p
                      ? 'border-accent bg-accent-soft text-accent-ink'
                      : 'border-line bg-surface text-muted hover:border-accent/30'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              className="mt-2.5"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              placeholder="Or type your own"
              maxLength={60}
            />
          </div>

          <Field label="How long">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 accent-[rgb(var(--c-accent))]"
                aria-label="Duration in minutes"
              />
              <span className="numeral w-20 text-right text-[1.4rem]">{duration}m</span>
            </div>
          </Field>

          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              How it felt
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {INTENSITY.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setIntensity(i + 1)}
                  aria-pressed={intensity === i + 1}
                  className={`rounded-2xl border-2 py-2.5 text-[0.84rem] font-bold transition-colors ${
                    intensity === i + 1
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-surface hover:border-accent/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Field label="A note (optional)">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Legs heavy, head clear."
              maxLength={300}
              className="min-h-[5rem]"
            />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}
