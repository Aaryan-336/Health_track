import type { User } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { localDateFor, todayLocalDate, type LocalDate } from '@/lib/dates';
import { Forbidden, NotFound } from '@/lib/permissions/errors';
import { autoApplyFromLog, type ProgressOutcome } from '@/features/goals/progress';
import { recalcHealthScore } from '@/lib/scores/health';
import type {
  habitCreateSchema,
  habitUpdateSchema,
  journalCreateSchema,
  journalUpdateSchema,
  mealCreateSchema,
  moodCreateSchema,
  waterCreateSchema,
  workoutCreateSchema,
} from '@/lib/validation/schemas';

/**
 * Health tracking.
 *
 * Every log follows the same shape from the architecture doc:
 *   create log → feed matching goals → recalculate the daily score
 * all inside one transaction, so a log can never exist without its derived
 * consequences having been settled.
 */

export type LogResult<T> = {
  entry: T;
  score: number | null;
  goalOutcomes: ProgressOutcome[];
};

function resolveDate(user: User, loggedAt?: string) {
  const instant = loggedAt ? new Date(loggedAt) : new Date();
  return { instant, localDate: localDateFor(instant, user.timezone) };
}

// ─── Water ──────────────────────────────────────────────────────────────────

export async function logWater(user: User, input: z.infer<typeof waterCreateSchema>) {
  const { instant, localDate } = resolveDate(user, input.loggedAt);

  return prisma.$transaction(async (tx) => {
    const entry = await tx.waterEntry.create({
      data: { userId: user.id, amountMl: input.amountMl, loggedAt: instant, localDate },
    });

    const profile = await tx.healthProfile.findUnique({ where: { userId: user.id } });
    const glassSize = profile?.glassSizeMl ?? 250;

    const goalOutcomes = await autoApplyFromLog(tx, {
      userId: user.id,
      category: ['WATER'],
      sourceType: 'WATER',
      sourceId: entry.id,
      localDate,
      amountFor: (unit) =>
        unit === 'ml'
          ? input.amountMl
          : unit === 'l' || unit === 'litres' || unit === 'liters'
            ? input.amountMl / 1000
            : input.amountMl / glassSize, // glasses
    });

    const { score } = await recalcHealthScore(tx, user.id, localDate, user.timezone);
    return { entry, score, goalOutcomes };
  });
}

export async function removeWaterEntry(user: User, entryId: string) {
  const entry = await prisma.waterEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw NotFound('That entry is gone already.');
  if (entry.userId !== user.id) throw Forbidden();

  return prisma.$transaction(async (tx) => {
    // Roll back any goal progress this log created, so totals stay reproducible.
    const contributions = await tx.goalContribution.findMany({
      where: { sourceType: 'WATER', sourceId: entryId },
    });
    for (const c of contributions) {
      await tx.goal.update({
        where: { id: c.goalId },
        data: { currentValue: { decrement: c.value } },
      });
    }
    await tx.goalContribution.deleteMany({ where: { sourceType: 'WATER', sourceId: entryId } });
    await tx.waterEntry.delete({ where: { id: entryId } });

    const { score } = await recalcHealthScore(tx, user.id, entry.localDate, user.timezone);
    return { score };
  });
}

export async function getWaterDay(userId: string, localDate: LocalDate) {
  const [entries, profile] = await Promise.all([
    prisma.waterEntry.findMany({ where: { userId, localDate }, orderBy: { loggedAt: 'asc' } }),
    prisma.healthProfile.findUnique({ where: { userId } }),
  ]);
  const totalMl = entries.reduce((s, e) => s + e.amountMl, 0);
  return {
    entries,
    totalMl,
    goalMl: profile?.dailyWaterGoalMl ?? 2000,
    glassSizeMl: profile?.glassSizeMl ?? 250,
  };
}

// ─── Meals ──────────────────────────────────────────────────────────────────

export async function logMeal(user: User, input: z.infer<typeof mealCreateSchema>) {
  const { instant, localDate } = resolveDate(user, input.loggedAt);

  return prisma.$transaction(async (tx) => {
    const entry = await tx.mealEntry.create({
      data: {
        userId: user.id,
        mealType: input.mealType,
        description: input.description,
        feelsGood: input.feelsGood,
        loggedAt: instant,
        localDate,
      },
    });

    const goalOutcomes = await autoApplyFromLog(tx, {
      userId: user.id,
      category: ['NUTRITION'],
      sourceType: 'MEAL',
      sourceId: entry.id,
      localDate,
      amountFor: () => 1,
    });

    const { score } = await recalcHealthScore(tx, user.id, localDate, user.timezone);
    return { entry, score, goalOutcomes };
  });
}

// ─── Workouts / activity ────────────────────────────────────────────────────

export async function logWorkout(user: User, input: z.infer<typeof workoutCreateSchema>) {
  const { instant, localDate } = resolveDate(user, input.loggedAt);

  return prisma.$transaction(async (tx) => {
    const entry = await tx.activityEntry.create({
      data: {
        userId: user.id,
        activityType: input.activityType,
        durationMinutes: input.durationMinutes,
        intensity: input.intensity,
        note: input.note ?? null,
        loggedAt: instant,
        localDate,
      },
    });

    const goalOutcomes = await autoApplyFromLog(tx, {
      userId: user.id,
      category: ['FITNESS', 'ACTIVITY'],
      sourceType: 'ACTIVITY',
      sourceId: entry.id,
      localDate,
      amountFor: (unit) =>
        unit === 'minutes' || unit === 'min' ? input.durationMinutes : 1, // sessions
    });

    const { score } = await recalcHealthScore(tx, user.id, localDate, user.timezone);
    return { entry, score, goalOutcomes };
  });
}

// ─── Mood ───────────────────────────────────────────────────────────────────

export async function logMood(user: User, input: z.infer<typeof moodCreateSchema>) {
  const { instant, localDate } = resolveDate(user, input.loggedAt);

  return prisma.$transaction(async (tx) => {
    const entry = await tx.moodEntry.create({
      data: {
        userId: user.id,
        moodValue: input.moodValue,
        stressValue: input.stressValue,
        note: input.note ?? null,
        shareMode: input.shareMode, // consent captured per entry, PRIVATE by default
        loggedAt: instant,
        localDate,
      },
    });

    const goalOutcomes = await autoApplyFromLog(tx, {
      userId: user.id,
      category: ['WELLNESS'],
      sourceType: 'MOOD',
      sourceId: entry.id,
      localDate,
      amountFor: () => 1,
    });

    const { score } = await recalcHealthScore(tx, user.id, localDate, user.timezone);
    return { entry, score, goalOutcomes };
  });
}

// ─── Journal ────────────────────────────────────────────────────────────────

export async function createJournalEntry(
  user: User,
  input: z.infer<typeof journalCreateSchema>,
) {
  const localDate = todayLocalDate(user.timezone);

  if (input.moodEntryId) {
    const mood = await prisma.moodEntry.findUnique({ where: { id: input.moodEntryId } });
    if (!mood || mood.userId !== user.id) throw Forbidden('That mood check-in is not yours.');
  }

  return prisma.journalEntry.create({
    data: {
      userId: user.id,
      title: input.title ?? null,
      content: input.content,
      prompt: input.prompt ?? null,
      moodEntryId: input.moodEntryId ?? null,
      isShared: input.isShared, // explicit per-entry sharing only
      localDate,
    },
  });
}

export async function updateJournalEntry(
  user: User,
  entryId: string,
  input: z.infer<typeof journalUpdateSchema>,
) {
  const entry = await prisma.journalEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.deletedAt) throw NotFound('That entry is gone.');
  if (entry.userId !== user.id) throw Forbidden('This journal is not yours.');

  return prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      ...(input.title !== undefined ? { title: input.title ?? null } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.isShared !== undefined ? { isShared: input.isShared } : {}),
    },
  });
}

export async function deleteJournalEntry(user: User, entryId: string) {
  const entry = await prisma.journalEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.deletedAt) throw NotFound('That entry is gone.');
  if (entry.userId !== user.id) throw Forbidden('This journal is not yours.');
  await prisma.journalEntry.update({ where: { id: entryId }, data: { deletedAt: new Date() } });
}

// ─── Habits ─────────────────────────────────────────────────────────────────

export async function createHabit(user: User, input: z.infer<typeof habitCreateSchema>) {
  return prisma.habit.create({ data: { ownerId: user.id, ...input } });
}

export async function updateHabit(
  user: User,
  habitId: string,
  input: z.infer<typeof habitUpdateSchema>,
) {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) throw NotFound('That habit is gone.');
  if (habit.ownerId !== user.id) throw Forbidden('This habit is not yours.');

  return prisma.habit.update({
    where: { id: habitId },
    data: {
      ...input,
      ...(input.active === false ? { archivedAt: new Date() } : {}),
      ...(input.active === true ? { archivedAt: null } : {}),
    },
  });
}

/** Toggles today's completion. Idempotent per habit per local day. */
export async function toggleHabitCompletion(
  user: User,
  habitId: string,
  opts: { localDate?: LocalDate; undo: boolean },
) {
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit) throw NotFound('That habit is gone.');
  if (habit.ownerId !== user.id) throw Forbidden('This habit is not yours.');

  const localDate = opts.localDate ?? todayLocalDate(user.timezone);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.habitCompletion.findFirst({
      where: { habitId, userId: user.id, localDate },
    });

    let completed: boolean;

    if (opts.undo || existing) {
      if (existing) {
        const contributions = await tx.goalContribution.findMany({
          where: { sourceType: 'HABIT', sourceId: existing.id },
        });
        for (const c of contributions) {
          await tx.goal.update({
            where: { id: c.goalId },
            data: { currentValue: { decrement: c.value } },
          });
        }
        await tx.goalContribution.deleteMany({
          where: { sourceType: 'HABIT', sourceId: existing.id },
        });
        await tx.habitCompletion.delete({ where: { id: existing.id } });
      }
      completed = false;
    } else {
      const completion = await tx.habitCompletion.create({
        data: { habitId, userId: user.id, localDate },
      });
      await autoApplyFromLog(tx, {
        userId: user.id,
        category: ['HABIT'],
        sourceType: 'HABIT',
        sourceId: completion.id,
        localDate,
        amountFor: () => 1,
      });
      completed = true;
    }

    const { score } = await recalcHealthScore(tx, user.id, localDate, user.timezone);
    return { completed, score, localDate };
  });
}

export async function listHabitsWithToday(userId: string, localDate: LocalDate) {
  const [habits, completions] = await Promise.all([
    prisma.habit.findMany({
      where: { ownerId: userId, active: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.habitCompletion.findMany({ where: { userId, localDate } }),
  ]);

  const done = new Set(completions.map((c) => c.habitId));
  return habits.map((h) => ({ ...h, completedToday: done.has(h.id) }));
}
