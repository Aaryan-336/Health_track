'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiError, patch } from '@/lib/client/api';
import { useRouter } from 'next/navigation';
import { useUI } from '@/stores/ui';

type Props = {
  waterGoalMl: number;
  glassSizeMl: number;
  mealGoal: number;
  weeklyWorkoutGoal: number;
  activityGoal: number;
};

/**
 * The numbers the daily health score is measured against. They are the user's
 * own targets, not a prescription — the copy stays deliberately gentle.
 */
export function TargetsScreen(initial: Props) {
  const [values, setValues] = useState<Props>(initial);
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const dirty = (Object.keys(initial) as (keyof Props)[]).some((k) => values[k] !== initial[k]);
  const glasses = Math.max(1, Math.round(values.waterGoalMl / values.glassSizeMl));

  const set = (key: keyof Props) => (value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      await patch('/profile', {
        healthProfile: {
          dailyWaterGoalMl: values.waterGoalMl,
          glassSizeMl: values.glassSizeMl,
          dailyMealGoal: values.mealGoal,
          weeklyWorkoutGoal: values.weeklyWorkoutGoal,
          dailyActivityGoal: values.activityGoal,
        },
      });
      toast('Targets updated', 'success', '🎯');
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
        title="Daily targets"
        subtitle="What a good day looks like for you. Your score is measured against these, and nothing else."
      />

      <div className="space-y-3">
        <Row
          emoji="💧"
          title="Water each day"
          detail={`About ${glasses} ${glasses === 1 ? 'glass' : 'glasses'}`}
          value={values.waterGoalMl}
          suffix="ml"
          step={100}
          min={250}
          max={8000}
          onChange={set('waterGoalMl')}
        />
        <Row
          emoji="🥛"
          title="One glass is"
          detail="Used for the glass count on your home screen"
          value={values.glassSizeMl}
          suffix="ml"
          step={50}
          min={50}
          max={1000}
          onChange={set('glassSizeMl')}
        />
        <Row
          emoji="🍽️"
          title="Meals a day"
          detail="Logged meals, not calories"
          value={values.mealGoal}
          step={1}
          min={1}
          max={10}
          onChange={set('mealGoal')}
        />
        <Row
          emoji="🏃"
          title="Workouts a week"
          detail="Anything that counts as moving on purpose"
          value={values.weeklyWorkoutGoal}
          step={1}
          min={0}
          max={21}
          onChange={set('weeklyWorkoutGoal')}
        />
        <Row
          emoji="🚶"
          title="Active minutes a day"
          detail="Walks count. So does dancing in the kitchen."
          value={values.activityGoal}
          suffix="min"
          step={5}
          min={5}
          max={600}
          onChange={set('activityGoal')}
        />
      </div>

      <Button fullWidth size="lg" className="mt-6" loading={busy} disabled={!dirty} onClick={save}>
        {dirty ? 'Save targets' : 'All saved'}
      </Button>

      <p className="mt-5 px-4 text-center text-[0.8rem] leading-relaxed text-faint">
        Missing a day never counts against you — a dimension you did not log is simply left out of
        the score.
      </p>
    </div>
  );
}

function Row({
  emoji,
  title,
  detail,
  value,
  suffix,
  step,
  min,
  max,
  onChange,
}: {
  emoji: string;
  title: string;
  detail: string;
  value: number;
  suffix?: string;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Card className="flex items-center gap-3.5 px-4 py-3.5">
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-raised text-lg">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{title}</p>
        <p className="mt-0.5 text-[0.82rem] text-muted">{detail}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          aria-label={`Less ${title}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-lg font-bold disabled:opacity-40"
        >
          −
        </button>
        <span className="numeral w-[3.6rem] text-center text-[0.95rem] font-bold">
          {value}
          {suffix && <span className="text-[0.72rem] text-muted"> {suffix}</span>}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          aria-label={`More ${title}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-lg font-bold disabled:opacity-40"
        >
          +
        </button>
      </div>
    </Card>
  );
}
