import type { Tx } from '@/lib/db/client';
import { prisma } from '@/lib/db/client';
import { endOfLocalDayUtc, startOfLocalDayUtc, type LocalDate } from '@/lib/dates';
import { MOOD_SCALE } from '@/lib/scores/constants';

/**
 * Daily health score — derived data, always recomputable from the source logs.
 *
 * Deliberate design choice (docs: "missing tracking data must not automatically
 * equal failure"): a dimension you did not engage with at all today is dropped
 * from the calculation rather than scored zero, and the remaining weights are
 * renormalised. A day with nothing logged has no score, not a score of zero.
 */

export type ScoreComponent = {
  key: 'water' | 'movement' | 'habits' | 'nourishment' | 'mood';
  label: string;
  weight: number;
  ratio: number; // 0..1
  engaged: boolean;
  detail: string;
};

export type HealthScoreResult = {
  localDate: LocalDate;
  score: number | null; // 0..100
  components: ScoreComponent[];
};

/**
 * Everything the score is derived from. Stated explicitly so a caller that has
 * already loaded a day — the home dashboard does — can score it without asking
 * the database for the same seven rows a second time.
 */
export type HealthScoreInputs = {
  waterMl: number;
  activeMinutes: number;
  activitySessions: number;
  meals: number;
  latestMood: { moodValue: string; stressValue: number } | null;
  scheduledHabitCount: number;
  habitsDone: number;
  goals: { waterMl: number; meals: number; activityMinutes: number };
};

const WEIGHTS = { water: 25, movement: 20, habits: 20, nourishment: 15, mood: 20 } as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Loads a day and scores it. Use `scoreFromInputs` if you already have the data. */
export async function computeHealthScore(
  db: Tx,
  userId: string,
  localDate: LocalDate,
  timezone: string,
): Promise<HealthScoreResult> {
  const dayStart = startOfLocalDayUtc(localDate, timezone);
  const dayEnd = endOfLocalDayUtc(localDate, timezone);

  const [profile, water, activities, meals, moods, activeHabits, completions] =
    await Promise.all([
      db.healthProfile.findUnique({ where: { userId } }),
      db.waterEntry.aggregate({
        where: { userId, localDate },
        _sum: { amountMl: true },
      }),
      db.activityEntry.aggregate({
        where: { userId, localDate },
        _sum: { durationMinutes: true },
        _count: true,
      }),
      db.mealEntry.count({ where: { userId, localDate } }),
      db.moodEntry.findMany({
        where: { userId, localDate },
        orderBy: { loggedAt: 'desc' },
      }),
      db.habit.findMany({
        where: { ownerId: userId, active: true, createdAt: { lt: dayEnd } },
      }),
      db.habitCompletion.findMany({ where: { userId, localDate } }),
    ]);

  void dayStart;

  const scheduledHabits = activeHabits.filter((h) => isHabitScheduled(h.frequencyRule, localDate));
  const completedHabitIds = new Set(completions.map((c) => c.habitId));

  return scoreFromInputs(localDate, {
    waterMl: water._sum.amountMl ?? 0,
    activeMinutes: activities._sum.durationMinutes ?? 0,
    activitySessions: activities._count,
    meals,
    latestMood: moods[0] ?? null,
    scheduledHabitCount: scheduledHabits.length,
    habitsDone: scheduledHabits.filter((h) => completedHabitIds.has(h.id)).length,
    goals: {
      waterMl: profile?.dailyWaterGoalMl ?? 2000,
      meals: profile?.dailyMealGoal ?? 3,
      activityMinutes: profile?.dailyActivityGoal ?? 30,
    },
  });
}

/**
 * The scoring rule itself — pure, so it is identical whoever loaded the data.
 *
 * A dimension you did not engage with at all is dropped and the remaining
 * weights renormalised, rather than scored zero: missing data is not failure.
 */
export function scoreFromInputs(
  localDate: LocalDate,
  input: HealthScoreInputs,
): HealthScoreResult {
  const { goals } = input;

  const components: ScoreComponent[] = [
    {
      key: 'water',
      label: 'Water',
      weight: WEIGHTS.water,
      ratio: clamp01(input.waterMl / Math.max(1, goals.waterMl)),
      engaged: input.waterMl > 0,
      detail: `${input.waterMl} / ${goals.waterMl} ml`,
    },
    {
      key: 'movement',
      label: 'Movement',
      weight: WEIGHTS.movement,
      ratio: clamp01(input.activeMinutes / Math.max(1, goals.activityMinutes)),
      engaged: input.activitySessions > 0,
      detail: `${input.activeMinutes} / ${goals.activityMinutes} min`,
    },
    {
      key: 'habits',
      label: 'Habits',
      weight: WEIGHTS.habits,
      ratio: input.scheduledHabitCount
        ? clamp01(input.habitsDone / input.scheduledHabitCount)
        : 0,
      engaged: input.scheduledHabitCount > 0,
      detail: `${input.habitsDone} / ${input.scheduledHabitCount}`,
    },
    {
      key: 'nourishment',
      label: 'Meals',
      weight: WEIGHTS.nourishment,
      ratio: clamp01(input.meals / Math.max(1, goals.meals)),
      engaged: input.meals > 0,
      detail: `${input.meals} / ${goals.meals}`,
    },
    {
      key: 'mood',
      label: 'Mood',
      weight: WEIGHTS.mood,
      ratio: input.latestMood
        ? moodRatio(input.latestMood.moodValue, input.latestMood.stressValue)
        : 0,
      engaged: Boolean(input.latestMood),
      detail: input.latestMood ? prettyMood(input.latestMood.moodValue) : 'Not checked in',
    },
  ];

  const engaged = components.filter((c) => c.engaged);
  if (engaged.length === 0) return { localDate, score: null, components };

  const totalWeight = engaged.reduce((sum, c) => sum + c.weight, 0);
  const earned = engaged.reduce((sum, c) => sum + c.weight * c.ratio, 0);

  return { localDate, score: Math.round((earned / totalWeight) * 100), components };
}

/** Recomputes and persists the derived score. Safe to run repeatedly. */
export async function recalcHealthScore(
  db: Tx,
  userId: string,
  localDate: LocalDate,
  timezone: string,
): Promise<HealthScoreResult> {
  const result = await computeHealthScore(db, userId, localDate, timezone);

  if (result.score === null) {
    await db.dailyScore.deleteMany({ where: { userId, localDate } });
    return result;
  }

  await db.dailyScore.upsert({
    where: { userId_localDate: { userId, localDate } },
    create: {
      userId,
      localDate,
      score: result.score,
      componentJson: result.components as unknown as object,
    },
    update: {
      score: result.score,
      componentJson: result.components as unknown as object,
      calculatedAt: new Date(),
    },
  });

  return result;
}

/** Convenience wrapper for callers that are not already inside a transaction. */
export const recalcHealthScoreNow = (
  userId: string,
  localDate: LocalDate,
  timezone: string,
) => recalcHealthScore(prisma, userId, localDate, timezone);

export function moodRatio(mood: string, stress: number): number {
  const moodPart = (MOOD_SCALE[mood as keyof typeof MOOD_SCALE] ?? 4) / 7;
  const stressPart = clamp01((5 - (stress - 1)) / 5);
  return clamp01(moodPart * 0.7 + stressPart * 0.3);
}

export function prettyMood(mood: string): string {
  return mood
    .toLowerCase()
    .split('_')
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}

/** frequencyRule is "DAILY" or "WEEKLY:MO,WE,FR". */
export function isHabitScheduled(rule: string, localDate: LocalDate): boolean {
  if (!rule || rule === 'DAILY') return true;
  if (rule.startsWith('WEEKLY:')) {
    const days = rule.slice(7).split(',').filter(Boolean);
    if (days.length === 0) return true;
    const dow = new Date(`${localDate}T12:00:00Z`).getUTCDay(); // 0=Sun
    const code = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][dow]!;
    return days.includes(code);
  }
  return true;
}
