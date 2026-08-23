import type { GoalCategory, Prisma } from '@prisma/client';

import type { Tx } from '@/lib/db/client';
import type { LocalDate } from '@/lib/dates';
import { Forbidden, NotFound } from '@/lib/permissions/errors';

/**
 * Goal progress engine.
 *
 * Every mutation runs inside the caller's transaction so that "add progress →
 * cross a milestone → complete the goal → record the celebration" either all
 * lands or none of it does.
 */

export type ProgressSource =
  | 'MANUAL'
  | 'WATER'
  | 'ACTIVITY'
  | 'HABIT'
  | 'MEAL'
  | 'MOOD'
  | 'CHECK_IN';

export type ProgressOutcome = {
  goalId: string;
  previousValue: number;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  milestonesReached: { label: string; thresholdPct: number }[];
};

type ApplyArgs = {
  goalId: string;
  userId: string;
  value: number;
  sourceType?: ProgressSource;
  sourceId?: string | null;
  note?: string | null;
  localDate: LocalDate;
};

/**
 * Applies a contribution and settles every derived consequence.
 * Callers must already have verified that `userId` may write to this goal.
 */
export async function applyGoalProgress(
  db: Tx,
  { goalId, userId, value, sourceType = 'MANUAL', sourceId = null, note = null, localDate }: ApplyArgs,
): Promise<ProgressOutcome> {
  const goal = await db.goal.findUnique({
    where: { id: goalId },
    include: { milestones: true, participants: true },
  });
  if (!goal || goal.deletedAt) throw NotFound('That goal no longer exists.');
  if (goal.status !== 'ACTIVE') {
    throw Forbidden('This goal is not active, so progress cannot be added.');
  }

  // An automatic contribution from a tracked log must never be double-counted.
  if (sourceType !== 'MANUAL' && sourceId) {
    const existing = await db.goalContribution.findFirst({
      where: { goalId, sourceType, sourceId },
    });
    if (existing) {
      return {
        goalId,
        previousValue: goal.currentValue,
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        completed: false,
        milestonesReached: [],
      };
    }
  }

  await db.goalContribution.create({
    data: { goalId, userId, value, sourceType, sourceId, note, localDate },
  });

  const previousValue = goal.currentValue;
  const currentValue = Math.max(0, round2(previousValue + value));
  const targetValue = goal.targetValue;

  const prevPct = pct(previousValue, targetValue);
  const nextPct = pct(currentValue, targetValue);

  const milestonesReached = goal.milestones
    .filter((m) => !m.reachedAt && m.thresholdPct > prevPct && m.thresholdPct <= nextPct)
    .map((m) => ({ id: m.id, label: m.label, thresholdPct: m.thresholdPct }));

  if (milestonesReached.length) {
    await db.goalMilestone.updateMany({
      where: { id: { in: milestonesReached.map((m) => m.id) } },
      data: { reachedAt: new Date() },
    });
  }

  const completed = currentValue >= targetValue && goal.status === 'ACTIVE';

  await db.goal.update({
    where: { id: goalId },
    data: {
      currentValue,
      ...(completed ? { status: 'COMPLETED', completedAt: new Date() } : {}),
    },
  });

  if (completed) {
    await db.celebration.create({
      data: {
        coupleId: goal.coupleId,
        goalId: goal.id,
        kind: 'GOAL_COMPLETED',
        title: `${goal.title} — done!`,
        body:
          goal.goalType === 'SHARED'
            ? 'You reached this one together. That is worth a moment.'
            : 'You saw it through. Take the win.',
        emoji: goal.emoji || '🎉',
      },
    });
  } else if (milestonesReached.length) {
    const top = milestonesReached[milestonesReached.length - 1]!;
    await db.celebration.create({
      data: {
        coupleId: goal.coupleId,
        goalId: goal.id,
        kind: 'MILESTONE_REACHED',
        title: `${top.thresholdPct}% of ${goal.title}`,
        body: top.label,
        emoji: '🌱',
      },
    });
  }

  return {
    goalId,
    previousValue,
    currentValue,
    targetValue,
    completed,
    milestonesReached: milestonesReached.map(({ label, thresholdPct }) => ({ label, thresholdPct })),
  };
}

/**
 * Feeds a tracked health log into any AUTO_TRACKED goal the user participates
 * in. Returns the outcomes so the caller can raise celebrations.
 */
export async function autoApplyFromLog(
  db: Tx,
  args: {
    userId: string;
    category: GoalCategory[];
    amountFor: (unit: string) => number;
    sourceType: ProgressSource;
    sourceId: string;
    localDate: LocalDate;
  },
): Promise<ProgressOutcome[]> {
  const goals = await db.goal.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      progressMode: 'AUTO_TRACKED',
      category: { in: args.category },
      participants: { some: { userId: args.userId, acceptanceStatus: 'ACCEPTED' } },
    },
    select: { id: true, unit: true },
  });

  const outcomes: ProgressOutcome[] = [];
  for (const goal of goals) {
    const value = args.amountFor(goal.unit.toLowerCase());
    if (value <= 0) continue;
    outcomes.push(
      await applyGoalProgress(db, {
        goalId: goal.id,
        userId: args.userId,
        value,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        localDate: args.localDate,
      }),
    );
  }
  return outcomes;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (value: number, target: number) =>
  target <= 0 ? 0 : Math.min(100, (value / target) * 100);

export const goalPercent = (goal: { currentValue: number; targetValue: number }) =>
  Math.round(pct(goal.currentValue, goal.targetValue));

export type GoalWithRelations = Prisma.GoalGetPayload<{
  include: { participants: { include: { user: true } }; milestones: true };
}>;
