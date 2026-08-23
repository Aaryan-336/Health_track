'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Input, Segmented } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, post } from '@/lib/client/api';
import { formatInstant } from '@/lib/dates';
import { useUI } from '@/stores/ui';

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER';
type Entry = {
  id: string;
  mealType: MealType;
  description: string;
  feelsGood: boolean;
  loggedAt: string;
};

const MEALS: { value: MealType; label: string; emoji: string }[] = [
  { value: 'BREAKFAST', label: 'Breakfast', emoji: '🌅' },
  { value: 'LUNCH', label: 'Lunch', emoji: '☀️' },
  { value: 'DINNER', label: 'Dinner', emoji: '🌙' },
  { value: 'SNACK', label: 'Snack', emoji: '🍎' },
  { value: 'OTHER', label: 'Other', emoji: '🍽️' },
];

export function MealTracker({
  initial,
  goal,
  timezone,
}: {
  initial: Entry[];
  goal: number;
  timezone: string;
}) {
  const [entries, setEntries] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mealType, setMealType] = useState<MealType>('BREAKFAST');
  const [description, setDescription] = useState('');
  const [feelsGood, setFeelsGood] = useState(true);
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const save = async () => {
    if (!description.trim()) return;
    setBusy(true);
    try {
      const res = await post<{ entry: Entry }>('/meals', {
        mealType,
        description: description.trim(),
        feelsGood,
      });
      setEntries((prev) => [...prev, res.entry]);
      setDescription('');
      setOpen(false);
      toast('Meal logged', 'success', '🥗');
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
        title="Meals today"
        subtitle="No calorie counting. Just what nourished you."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            Add
          </Button>
        }
      />

      <Card tone="sage" className="mb-5">
        <CardLabel>Today</CardLabel>
        <p className="numeral mt-1 text-[2.6rem] leading-none">
          {entries.length}
          <span className="text-[1.4rem] text-muted"> of {goal}</span>
        </p>
        <p className="mt-1 text-[0.86rem] text-muted">
          {entries.length >= goal ? 'Well fed today.' : 'Eat when you are hungry.'}
        </p>
      </Card>

      {entries.length === 0 ? (
        <Empty
          emoji="🥗"
          title="Nothing logged yet"
          body="Add what you ate — a few words is plenty."
          action={<Button onClick={() => setOpen(true)}>Log a meal</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {entries.map((e) => {
              const meta = MEALS.find((m) => m.value === e.mealType)!;
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="flex items-center gap-3.5 p-4">
                    <span aria-hidden className="text-2xl">
                      {meta.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold leading-tight">{e.description}</p>
                      <p className="mt-0.5 text-[0.8rem] text-muted">
                        {meta.label} · {formatInstant(new Date(e.loggedAt), timezone)}
                      </p>
                    </div>
                    {e.feelsGood && <Pill tone="sage">felt good</Pill>}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="What did you have?"
        footer={
          <Button fullWidth size="lg" onClick={save} loading={busy} disabled={!description.trim()}>
            Log it
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Which meal
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {MEALS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMealType(m.value)}
                  aria-pressed={mealType === m.value}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 py-2.5 transition-colors ${
                    mealType === m.value
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-surface hover:border-accent/30'
                  }`}
                >
                  <span className="text-lg" aria-hidden>
                    {m.emoji}
                  </span>
                  <span className="text-[0.62rem] font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Field label="What was it?">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Porridge with berries"
              maxLength={300}
              autoFocus
            />
          </Field>

          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              How did it sit with you?
            </p>
            <Segmented
              value={feelsGood ? 'good' : 'meh'}
              onChange={(v) => setFeelsGood(v === 'good')}
              options={[
                { value: 'good', label: 'Felt good' },
                { value: 'meh', label: 'Not my best' },
              ]}
            />
          </div>
        </div>
      </Sheet>
    </div>
  );
}
