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

const WEIGHTS = { water: 25, movement: 20, habits: 20, nourishment: 15, mood: 20 } as const;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

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

  const waterGoal = profile?.dailyWaterGoalMl ?? 2000;
  const mealGoal = profile?.dailyMealGoal ?? 3;
  const activityGoal = profile?.dailyActivityGoal ?? 30;

  const waterMl = water._sum.amountMl ?? 0;
  const activeMinutes = activities._sum.durationMinutes ?? 0;

  const scheduledHabits = activeHabits.filter((h) => isHabitScheduled(h.frequencyRule, localDate));
  const completedHabitIds = new Set(completions.map((c) => c.habitId));
  const habitsDone = scheduledHabits.filter((h) => completedHabitIds.has(h.id)).length;

  const latestMood = moods[0];

  const components: ScoreComponent[] = [
    {
      key: 'water',
      label: 'Water',
      weight: WEIGHTS.water,
      ratio: clamp01(waterMl / Math.max(1, waterGoal)),
      engaged: waterMl > 0,
      detail: `${waterMl} / ${waterGoal} ml`,
    },
    {
      key: 'movement',
      label: 'Movement',
      weight: WEIGHTS.movement,
      ratio: clamp01(activeMinutes / Math.max(1, activityGoal)),
      engaged: activities._count > 0,
      detail: `${activeMinutes} / ${activityGoal} min`,
    },
    {
      key: 'habits',
      label: 'Habits',
      weight: WEIGHTS.habits,
      ratio: scheduledHabits.length ? clamp01(habitsDone / scheduledHabits.length) : 0,
      engaged: scheduledHabits.length > 0,
      detail: `${habitsDone} / ${scheduledHabits.length}`,
    },
    {
      key: 'nourishment',
      label: 'Meals',
      weight: WEIGHTS.nourishment,
      ratio: clamp01(meals / Math.max(1, mealGoal)),
      engaged: meals > 0,
      detail: `${meals} / ${mealGoal}`,
    },
    {
      key: 'mood',
      label: 'Mood',
      weight: WEIGHTS.mood,
      ratio: latestMood ? moodRatio(latestMood.moodValue, latestMood.stressValue) : 0,
      engaged: Boolean(latestMood),
      detail: latestMood ? prettyMood(latestMood.moodValue) : 'Not checked in',
    },
  ];

  const engaged = components.filter((c) => c.engaged);
  if (engaged.length === 0) {
    return { localDate, score: null, components };
  }

  const totalWeight = engaged.reduce((sum, c) => sum + c.weight, 0);
  const earned = engaged.reduce((sum, c) => sum + c.weight * c.ratio, 0);
  const score = Math.round((earned / totalWeight) * 100);

  return { localDate, score, components };
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
