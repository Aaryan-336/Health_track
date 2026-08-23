'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Segmented, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiError, post } from '@/lib/client/api';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';
import {
  GOAL_CATEGORY_META,
  HEALTH_CATEGORIES,
  RELATIONSHIP_CATEGORIES,
} from './categories';

type Category = keyof typeof GOAL_CATEGORY_META;
type ProgressMode = 'MANUAL' | 'AUTO_TRACKED' | 'CHECK_IN';

/** Categories whose progress can be fed automatically from tracked logs. */
const AUTO_CAPABLE: Category[] = ['WATER', 'NUTRITION', 'FITNESS', 'ACTIVITY', 'HABIT', 'WELLNESS'];

const UNIT_SUGGESTIONS: Partial<Record<Category, string[]>> = {
  WATER: ['glasses', 'ml', 'days'],
  NUTRITION: ['meals', 'days'],
  FITNESS: ['sessions', 'minutes'],
  ACTIVITY: ['sessions', 'minutes', 'steps'],
  HABIT: ['times', 'days'],
  WELLNESS: ['check-ins', 'days'],
  RELATIONSHIP: ['times', 'weeks'],
  DATE_ADVENTURE: ['dates', 'trips'],
  QUALITY_TIME: ['evenings', 'walks', 'hours'],
  CUSTOM: ['times'],
};

const TONE_BG: Record<string, string> = {
  honey: 'bg-honey-soft',
  blush: 'bg-blush-soft',
  lilac: 'bg-lilac-soft',
  sage: 'bg-sage-soft',
  sky: 'bg-sky-soft',
  clay: 'bg-clay-soft',
};

export function GoalComposer({
  connected,
  partnerName,
}: {
  connected: boolean;
  partnerName: string | null;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [goalType, setGoalType] = useState<'INDIVIDUAL' | 'SHARED'>('INDIVIDUAL');
  const [category, setCategory] = useState<Category>('FITNESS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🏃');
  const [targetValue, setTargetValue] = useState(10);
  const [unit, setUnit] = useState('sessions');
  const [progressMode, setProgressMode] = useState<ProgressMode>('MANUAL');
  const [deadline, setDeadline] = useState('');

  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const chooseCategory = (c: Category) => {
    setCategory(c);
    setEmoji(GOAL_CATEGORY_META[c].emoji);
    setUnit(UNIT_SUGGESTIONS[c]?.[0] ?? 'times');
    if (!AUTO_CAPABLE.includes(c)) setProgressMode('MANUAL');
  };

  const create = async () => {
    setBusy(true);
    try {
      const goal = await post<{ id: string }>('/goals', {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        emoji,
        goalType,
        targetValue,
        unit,
        progressMode,
        deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null,
      });
      toast('Goal created', 'success', emoji);
      router.push(`/goals/${goal.id}`);
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not create that goal.', 'error');
      setBusy(false);
    }
  };

  const canContinue = step === 0 ? true : step === 1 ? title.trim().length > 0 : targetValue >= 1;

  return (
    <div>
      <PageHeader title="A new goal" subtitle="Three quick steps." />

      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-pill transition-colors duration-500',
              i <= step ? 'bg-accent' : 'bg-line',
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* ── Step 1: who and what kind ────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
                  Who is this for?
                </p>
                <Segmented
                  value={goalType}
                  onChange={(v) => {
                    if (v === 'SHARED' && !connected) {
                      toast('Connect with your partner first', 'info', '💞');
                      return;
                    }
                    setGoalType(v);
                  }}
                  options={[
                    { value: 'INDIVIDUAL', label: 'Just me' },
                    { value: 'SHARED', label: connected ? `Me & ${partnerName?.split(' ')[0]}` : 'Together' },
                  ]}
                />
                {!connected && (
                  <p className="mt-2 text-[0.8rem] text-faint">
                    Connect with a partner to create shared goals.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
                  Health & wellbeing
                </p>
                <CategoryGrid selected={category} onSelect={chooseCategory} options={HEALTH_CATEGORIES} />
              </div>

              <div>
                <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
                  The two of you
                </p>
                <CategoryGrid
                  selected={category}
                  onSelect={chooseCategory}
                  options={RELATIONSHIP_CATEGORIES}
                />
              </div>
            </div>
          )}

          {/* ── Step 2: name it ──────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <Card tone={GOAL_CATEGORY_META[category].colour as 'honey'} className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  {emoji}
                </span>
                <div>
                  <p className="font-bold">{GOAL_CATEGORY_META[category].label}</p>
                  <p className="text-[0.8rem] text-muted">
                    {goalType === 'SHARED' ? 'Shared goal' : 'Just for you'}
                  </p>
                </div>
              </Card>

              <Field label="What are you aiming for?">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Twelve dates this year"
                  maxLength={100}
                  autoFocus
                />
              </Field>

              <Field label="Why does it matter? (optional)">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="One properly planned evening a month. Phones away."
                  maxLength={600}
                  className="min-h-[5.5rem]"
                />
              </Field>

              <Field label="An emoji for it">
                <Input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
                  className="w-24 text-center text-2xl"
                  maxLength={8}
                />
              </Field>
            </div>
          )}

          {/* ── Step 3: the target ───────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Target">
                  <Input
                    type="number"
                    min={1}
                    value={targetValue}
                    onChange={(e) => setTargetValue(Math.max(1, Number(e.target.value) || 1))}
                  />
                </Field>
                <Field label="Measured in">
                  <Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={24} />
                </Field>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(UNIT_SUGGESTIONS[category] ?? ['times']).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={cn(
                      'rounded-pill border px-3.5 py-1.5 text-[0.8rem] font-bold transition-colors',
                      unit === u
                        ? 'border-accent bg-accent-soft text-accent-ink'
                        : 'border-line bg-surface text-muted hover:border-accent/30',
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>

              {AUTO_CAPABLE.includes(category) && (
                <div>
                  <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
                    How does progress get counted?
                  </p>
                  <Segmented
                    value={progressMode}
                    onChange={(v) => setProgressMode(v as ProgressMode)}
                    options={[
                      { value: 'MANUAL', label: 'I add it' },
                      { value: 'AUTO_TRACKED', label: 'From my logs' },
                    ]}
                  />
                  <p className="mt-2 text-[0.82rem] leading-snug text-muted">
                    {progressMode === 'AUTO_TRACKED'
                      ? `Every ${GOAL_CATEGORY_META[category].label.toLowerCase()} entry you log will count towards this automatically.`
                      : 'You add progress yourself whenever you like.'}
                  </p>
                </div>
              )}

              <Field label="By when? (optional)">
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </Field>

              <Card tone="accent">
                <p className="text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
                  Your goal
                </p>
                <p className="mt-1.5 font-display text-[1.35rem] leading-tight">
                  {emoji} {title || 'Untitled goal'}
                </p>
                <p className="mt-1 text-[0.88rem] text-muted">
                  {targetValue} {unit}
                  {goalType === 'SHARED' && partnerName ? ` · with ${partnerName.split(' ')[0]}` : ''}
                </p>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button fullWidth size="lg" onClick={() => setStep(step + 1)} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <Button fullWidth size="lg" onClick={create} loading={busy} disabled={!title.trim()}>
            Create goal
          </Button>
        )}
      </div>
    </div>
  );
}

function CategoryGrid({
  options,
  selected,
  onSelect,
}: {
  options: Category[];
  selected: Category;
  onSelect: (c: Category) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((c) => {
        const meta = GOAL_CATEGORY_META[c];
        const active = selected === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition-all duration-200',
              active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-accent/30',
            )}
          >
            <span
              aria-hidden
              className={cn('grid h-9 w-9 place-items-center rounded-blob text-lg', TONE_BG[meta.colour])}
            >
              {meta.emoji}
            </span>
            <span className="text-center text-[0.7rem] font-bold leading-tight">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
