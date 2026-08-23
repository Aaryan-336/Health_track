'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { Field, Input } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, patch, post } from '@/lib/client/api';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';
import { HabitRow } from './HabitRow';

type Habit = {
  id: string;
  title: string;
  colour: string;
  frequencyRule: string;
  completedToday: boolean;
  scheduledToday: boolean;
  streak: number;
};

const COLOURS = ['honey', 'blush', 'lilac', 'sage', 'sky', 'clay'] as const;
const DAYS = [
  { code: 'MO', label: 'M' },
  { code: 'TU', label: 'T' },
  { code: 'WE', label: 'W' },
  { code: 'TH', label: 'T' },
  { code: 'FR', label: 'F' },
  { code: 'SA', label: 'S' },
  { code: 'SU', label: 'S' },
];

const SWATCH: Record<string, string> = {
  honey: 'bg-honey',
  blush: 'bg-blush',
  lilac: 'bg-lilac',
  sage: 'bg-sage',
  sky: 'bg-sky',
  clay: 'bg-clay',
};

export function HabitsScreen({ initial }: { initial: Habit[] }) {
  const [habits, setHabits] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [colour, setColour] = useState<string>('lilac');
  const [everyday, setEveryday] = useState(true);
  const [days, setDays] = useState<string[]>(['MO', 'WE', 'FR']);
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const scheduled = habits.filter((h) => h.scheduledToday);
  const doneCount = scheduled.filter((h) => h.completedToday).length;

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const habit = await post<Habit>('/habits', {
        title: title.trim(),
        colour,
        frequencyRule: everyday ? 'DAILY' : `WEEKLY:${days.join(',')}`,
      });
      setHabits((prev) => [
        ...prev,
        { ...habit, completedToday: false, scheduledToday: true, streak: 0 },
      ]);
      setTitle('');
      setOpen(false);
      toast('Habit added', 'success', '🌱');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not add that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const archive = async (id: string) => {
    const before = habits;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    try {
      await patch(`/habits/${id}`, { active: false });
      toast('Habit archived', 'info', '📥');
      router.refresh();
    } catch (error) {
      setHabits(before);
      toast(error instanceof ApiError ? error.message : 'Could not archive that.', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Habits"
        subtitle="Small things, done often."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            Add
          </Button>
        }
      />

      {habits.length > 0 && (
        <Card tone="lilac" className="mb-5">
          <CardLabel>Today</CardLabel>
          <p className="numeral mt-1 text-[2.6rem] leading-none">
            {doneCount}
            <span className="text-[1.4rem] text-muted"> of {scheduled.length}</span>
          </p>
          <p className="mt-1 text-[0.86rem] text-muted">
            {scheduled.length === 0
              ? 'Nothing scheduled for today — enjoy the pause.'
              : doneCount === scheduled.length
                ? 'All done. Beautifully consistent.'
                : 'Every one you tick counts.'}
          </p>
        </Card>
      )}

      {habits.length === 0 ? (
        <Empty
          emoji="🌱"
          title="No habits yet"
          body="Pick one or two small things you'd like to do most days. Little and often beats big and rare."
          action={<Button onClick={() => setOpen(true)}>Add your first habit</Button>}
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {habits.map((h) => (
              <motion.div
                key={h.id}
                layout
                exit={{ opacity: 0, x: -20 }}
                className="group relative"
              >
                {h.scheduledToday ? (
                  <HabitRow habit={h} streak={h.streak} />
                ) : (
                  <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-line p-3.5 opacity-60">
                    <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-raised">
                      🌱
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold leading-tight">{h.title}</span>
                      <span className="text-[0.78rem] text-muted">Not scheduled today</span>
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => archive(h.id)}
                  aria-label={`Archive ${h.title}`}
                  className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-muted opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="A new habit"
        footer={
          <Button fullWidth size="lg" onClick={create} loading={busy} disabled={!title.trim()}>
            Add habit
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="What is it?">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Morning stretch"
              maxLength={80}
              autoFocus
            />
          </Field>

          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Colour
            </p>
            <div className="flex gap-2">
              {COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColour(c)}
                  aria-label={c}
                  aria-pressed={colour === c}
                  className={cn(
                    'h-10 w-10 rounded-blob transition-transform duration-200',
                    SWATCH[c],
                    colour === c ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-canvas' : 'opacity-70',
                  )}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              How often
            </p>
            <div className="mb-2.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => setEveryday(true)}
                aria-pressed={everyday}
                className={cn(
                  'flex-1 rounded-pill border-2 py-2.5 text-[0.86rem] font-bold transition-colors',
                  everyday ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
                )}
              >
                Every day
              </button>
              <button
                type="button"
                onClick={() => setEveryday(false)}
                aria-pressed={!everyday}
                className={cn(
                  'flex-1 rounded-pill border-2 py-2.5 text-[0.86rem] font-bold transition-colors',
                  !everyday ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
                )}
              >
                Certain days
              </button>
            </div>

            {!everyday && (
              <div className="flex gap-1.5">
                {DAYS.map((d) => {
                  const on = days.includes(d.code);
                  return (
                    <button
                      key={d.code}
                      type="button"
                      onClick={() =>
                        setDays((prev) =>
                          on ? prev.filter((x) => x !== d.code) : [...prev, d.code],
                        )
                      }
                      aria-pressed={on}
                      aria-label={d.code}
                      className={cn(
                        'h-10 flex-1 rounded-xl border-2 text-[0.8rem] font-bold transition-colors',
                        on ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted',
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
