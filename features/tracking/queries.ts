import type { User } from '@prisma/client';

import { prisma } from '@/lib/db/client';
import { lastNLocalDates, todayLocalDate, weekOf } from '@/lib/dates';
import { computeHealthScore, isHabitScheduled } from '@/lib/scores/health';
import { computeActivityStreak } from '@/lib/scores/streaks';
import { goalPercent } from '@/features/goals/progress';
import { getCoupleContext } from '@/lib/permissions';
import { buildPartnerSnapshot, type PartnerSnapshot } from '@/features/couple/snapshot';

/**
 * Everything the personal dashboard needs, assembled server-side in one place
 * so no business logic leaks into the React tree.
 */
export async function getHomeData(user: User) {
  const today = todayLocalDate(user.timezone);
  const week = weekOf(today);

  const [
    scoreResult,
    profile,
    waterAgg,
    habits,
    completions,
    activityAgg,
    meals,
    mood,
    goals,
    streak,
    insights,
    scoreHistory,
    ctx,
  ] = await Promise.all([
    computeHealthScore(prisma, user.id, today, user.timezone),
    prisma.healthProfile.findUnique({ where: { userId: user.id } }),
    prisma.waterEntry.aggregate({ where: { userId: user.id, localDate: today }, _sum: { amountMl: true } }),
    prisma.habit.findMany({ where: { ownerId: user.id, active: true }, orderBy: { createdAt: 'asc' } }),
    prisma.habitCompletion.findMany({ where: { userId: user.id, localDate: today } }),
    prisma.activityEntry.aggregate({
      where: { userId: user.id, localDate: today },
      _sum: { durationMinutes: true },
      _count: true,
    }),
    prisma.mealEntry.count({ where: { userId: user.id, localDate: today } }),
    prisma.moodEntry.findFirst({ where: { userId: user.id, localDate: today }, orderBy: { loggedAt: 'desc' } }),
    prisma.goal.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        participants: { some: { userId: user.id, acceptanceStatus: 'ACCEPTED' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    computeActivityStreak(prisma, user.id, today),
    prisma.aiInsight.findMany({
      where: { userId: user.id, dismissedAt: null },
      orderBy: { generatedAt: 'desc' },
      take: 1,
    }),
    prisma.dailyScore.findMany({
      where: { userId: user.id, localDate: { in: lastNLocalDates(today, 7) } },
      select: { localDate: true, score: true },
    }),
    getCoupleContext(user.id),
  ]);

  const doneHabitIds = new Set(completions.map((c) => c.habitId));
  const scheduledHabits = habits.filter((h) => isHabitScheduled(h.frequencyRule, today));

  // The partner card only ever contains what they explicitly chose to share.
  let partnerSnapshot: PartnerSnapshot | null = null;
  if (ctx?.couple.status === 'ACTIVE' && ctx.partner) {
    partnerSnapshot = await buildPartnerSnapshot(ctx.partner, user.id);
  }

  const scoreByDate = new Map(scoreHistory.map((s) => [s.localDate, s.score]));
  if (scoreResult.score !== null) scoreByDate.set(today, scoreResult.score);

  const glassSize = profile?.glassSizeMl ?? 250;
  const waterMl = waterAgg._sum.amountMl ?? 0;

  return {
    today,
    week: week.map((d) => ({
      localDate: d,
      done: scoreByDate.has(d),
      score: scoreByDate.get(d) ?? null,
    })),
    score: scoreResult,
    streak,
    water: {
      totalMl: waterMl,
      goalMl: profile?.dailyWaterGoalMl ?? 2000,
      glasses: Math.floor(waterMl / glassSize),
      goalGlasses: Math.round((profile?.dailyWaterGoalMl ?? 2000) / glassSize),
      glassSizeMl: glassSize,
    },
    habits: {
      total: scheduledHabits.length,
      done: scheduledHabits.filter((h) => doneHabitIds.has(h.id)).length,
      items: scheduledHabits.slice(0, 5).map((h) => ({
        id: h.id,
        title: h.title,
        colour: h.colour,
        completedToday: doneHabitIds.has(h.id),
      })),
    },
    activity: {
      minutes: activityAgg._sum.durationMinutes ?? 0,
      goal: profile?.dailyActivityGoal ?? 30,
      sessions: activityAgg._count,
    },
    meals: { count: meals, goal: profile?.dailyMealGoal ?? 3 },
    mood,
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      emoji: g.emoji,
      category: g.category,
      goalType: g.goalType,
      unit: g.unit,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      percent: goalPercent(g),
    })),
    insight: insights[0] ?? null,
    partnerSnapshot,
    hasPartner: Boolean(ctx?.couple.status === 'ACTIVE' && ctx.partner),
  };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
