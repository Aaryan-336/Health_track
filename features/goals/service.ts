import type { GoalCategory, GoalStatus } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { todayLocalDate } from '@/lib/dates';
import { Forbidden, NotFound } from '@/lib/permissions/errors';
import { getCoupleContext } from '@/lib/permissions';
import type { goalCreateSchema, goalUpdateSchema } from '@/lib/validation/schemas';
import { applyGoalProgress, type ProgressOutcome } from './progress';

type CreateInput = z.infer<typeof goalCreateSchema>;
type UpdateInput = z.infer<typeof goalUpdateSchema>;

const goalInclude = {
  participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
  milestones: { orderBy: { thresholdPct: 'asc' } },
  creator: { select: { id: true, displayName: true, avatarUrl: true } },
} as const;

/**
 * Reads are permitted for a participant, or for either member of the couple a
 * shared goal belongs to. Nothing else resolves.
 */
export async function getGoalForUser(goalId: string, userId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId }, include: goalInclude });
  if (!goal || goal.deletedAt) throw NotFound('That goal no longer exists.');

  const isParticipant = goal.participants.some((p) => p.userId === userId);
  if (isParticipant) return goal;

  if (goal.coupleId) {
    const couple = await prisma.coupleRelationship.findUnique({ where: { id: goal.coupleId } });
    const isMember =
      couple && couple.status !== 'ENDED' && (couple.userAId === userId || couple.userBId === userId);
    if (isMember) return goal;
  }

  throw Forbidden('This goal is not yours.');
}

/** Only an accepted participant may move a goal's numbers. */
export async function assertCanContribute(goalId: string, userId: string) {
  const goal = await getGoalForUser(goalId, userId);
  const participant = goal.participants.find((p) => p.userId === userId);
  if (!participant || participant.acceptanceStatus !== 'ACCEPTED') {
    throw Forbidden('Accept this goal before adding progress.');
  }
  return goal;
}

export async function listGoalsForUser(
  userId: string,
  filter?: { status?: GoalStatus[]; category?: GoalCategory[]; goalType?: 'INDIVIDUAL' | 'SHARED' },
) {
  const ctx = await getCoupleContext(userId);
  const coupleId = ctx?.couple.id;

  return prisma.goal.findMany({
    where: {
      deletedAt: null,
      ...(filter?.status ? { status: { in: filter.status } } : {}),
      ...(filter?.category ? { category: { in: filter.category } } : {}),
      ...(filter?.goalType ? { goalType: filter.goalType } : {}),
      OR: [
        { participants: { some: { userId } } },
        ...(coupleId ? [{ coupleId, goalType: 'SHARED' as const }] : []),
      ],
    },
    include: goalInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

const DEFAULT_MILESTONES = [25, 50, 75];

const milestoneLabel = (pct: number) =>
  pct <= 25 ? 'Off to a lovely start' : pct <= 50 ? 'Halfway there' : 'Nearly there';

/**
 * Shared goals attach both partners in one transaction — a shared goal must
 * never exist half-created with only one participant.
 */
export async function createGoal(userId: string, input: CreateInput) {
  const isShared = input.goalType === 'SHARED';

  let coupleId: string | null = null;
  let partnerId: string | null = null;

  if (isShared) {
    const ctx = await getCoupleContext(userId);
    if (!ctx || ctx.couple.status !== 'ACTIVE' || !ctx.partner) {
      throw Forbidden('Connect with your partner before creating a shared goal.');
    }
    coupleId = ctx.couple.id;
    partnerId = ctx.partner.id;
  }

  const thresholds = (input.milestones?.length ? input.milestones : DEFAULT_MILESTONES)
    .filter((n) => n > 0 && n < 100)
    .sort((a, b) => a - b);

  return prisma.$transaction(async (tx) => {
    const goal = await tx.goal.create({
      data: {
        ownerType: isShared ? 'COUPLE' : 'PERSONAL',
        goalType: input.goalType,
        coupleId,
        creatorId: userId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        emoji: input.emoji,
        targetValue: input.targetValue,
        unit: input.unit,
        deadline: input.deadline ? new Date(input.deadline) : null,
        recurrenceRule: input.recurrenceRule ?? null,
        progressMode: input.progressMode,
        status: 'ACTIVE',
      },
    });

    await tx.goalParticipant.create({
      data: { goalId: goal.id, userId, role: 'OWNER', acceptanceStatus: 'ACCEPTED', respondedAt: new Date() },
    });

    if (partnerId) {
      await tx.goalParticipant.create({
        data: { goalId: goal.id, userId: partnerId, role: 'PARTNER', acceptanceStatus: 'ACCEPTED', respondedAt: new Date() },
      });
    }

    if (thresholds.length) {
      await tx.goalMilestone.createMany({
        data: thresholds.map((thresholdPct) => ({
          goalId: goal.id,
          thresholdPct,
          label: milestoneLabel(thresholdPct),
        })),
      });
    }

    await tx.auditEvent.create({
      data: {
        actorId: userId,
        eventType: 'goal.created',
        resourceType: 'goal',
        resourceId: goal.id,
        metadataJson: { goalType: input.goalType, category: input.category },
      },
    });

    return tx.goal.findUniqueOrThrow({ where: { id: goal.id }, include: goalInclude });
  });
}

export async function updateGoal(goalId: string, userId: string, input: UpdateInput) {
  const goal = await getGoalForUser(goalId, userId);

  // Only the creator may retitle or retarget; either partner may pause/resume.
  const structural =
    input.title !== undefined ||
    input.targetValue !== undefined ||
    input.unit !== undefined ||
    input.description !== undefined ||
    input.emoji !== undefined ||
    input.deadline !== undefined;

  if (structural && goal.creatorId !== userId) {
    throw Forbidden('Only the partner who created this goal can edit its details.');
  }

  return prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
      ...(input.targetValue !== undefined ? { targetValue: input.targetValue } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.deadline !== undefined
        ? { deadline: input.deadline ? new Date(input.deadline) : null }
        : {}),
      ...(input.status !== undefined
        ? { status: input.status, completedAt: input.status === 'COMPLETED' ? new Date() : null }
        : {}),
    },
    include: goalInclude,
  });
}

/** Soft delete — a completed goal's history stays meaningful. */
export async function deleteGoal(goalId: string, userId: string) {
  const goal = await getGoalForUser(goalId, userId);
  if (goal.creatorId !== userId) {
    throw Forbidden('Only the partner who created this goal can remove it.');
  }
  await prisma.goal.update({ where: { id: goalId }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
}

export async function addProgress(
  goalId: string,
  userId: string,
  value: number,
  note: string | undefined,
  timezone: string,
): Promise<ProgressOutcome> {
  await assertCanContribute(goalId, userId);
  const localDate = todayLocalDate(timezone);

  return prisma.$transaction((tx) =>
    applyGoalProgress(tx, { goalId, userId, value, note: note ?? null, localDate }),
  );
}

export async function respondToInvitation(
  goalId: string,
  userId: string,
  acceptanceStatus: 'ACCEPTED' | 'DECLINED',
) {
  const participant = await prisma.goalParticipant.findFirst({ where: { goalId, userId } });
  if (!participant) throw NotFound('You were not invited to this goal.');

  return prisma.goalParticipant.update({
    where: { id: participant.id },
    data: { acceptanceStatus, respondedAt: new Date() },
  });
}

export { GOAL_CATEGORY_META } from './categories';
