import type { User } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { BadRequest, Forbidden, NotFound } from '@/lib/permissions/errors';
import { requireActiveCouple } from '@/lib/permissions';
import { notify } from '@/features/notifications/service';
import type { challengeCreateSchema } from '@/lib/validation/schemas';

/** Couple challenges — a shared, time-boxed push that both partners feed. */

export async function listChallenges(userId: string) {
  const ctx = await requireActiveCouple(userId);

  const challenges = await prisma.challenge.findMany({
    where: { coupleId: ctx.couple.id },
    orderBy: [{ status: 'asc' }, { startAt: 'desc' }],
  });

  return challenges.map((c) => ({
    ...c,
    myProgress: ctx.side === 'A' ? c.progressA : c.progressB,
    partnerProgress: ctx.side === 'A' ? c.progressB : c.progressA,
  }));
}

export async function createChallenge(user: User, input: z.infer<typeof challengeCreateSchema>) {
  const ctx = await requireActiveCouple(user.id);

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  if (endAt <= startAt) throw BadRequest('The end date needs to be after the start.');

  const challenge = await prisma.challenge.create({
    data: {
      coupleId: ctx.couple.id,
      title: input.title,
      description: input.description ?? null,
      emoji: input.emoji,
      startAt,
      endAt,
      targetRule: input.targetRule,
      targetValue: input.targetValue,
      status: startAt > new Date() ? 'UPCOMING' : 'ACTIVE',
    },
  });

  await notify({
    userId: ctx.partner!.id,
    type: 'COUPLE_UPDATE',
    dedupeKey: `challenge:${challenge.id}`,
    relatedResourceType: 'challenge',
    relatedResourceId: challenge.id,
    payload: {
      title: `${user.displayName} started a challenge ${challenge.emoji}`,
      body: challenge.title,
      url: '/us/challenges',
      emoji: challenge.emoji,
      background: 'ember',
    },
  });

  return challenge;
}

/** Adds to the caller's own side of the challenge, and settles completion. */
export async function addChallengeProgress(user: User, challengeId: string, increment: number) {
  const ctx = await requireActiveCouple(user.id);

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw NotFound('That challenge is gone.');
  if (challenge.coupleId !== ctx.couple.id) throw Forbidden('That challenge is not yours.');
  if (challenge.status !== 'ACTIVE') throw BadRequest('This challenge is not running.');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.challenge.update({
      where: { id: challengeId },
      data:
        ctx.side === 'A'
          ? { progressA: { increment } }
          : { progressB: { increment } },
    });

    const done =
      updated.progressA >= updated.targetValue && updated.progressB >= updated.targetValue;

    if (!done) return updated;

    const finished = await tx.challenge.update({
      where: { id: challengeId },
      data: { status: 'COMPLETED' },
    });

    await tx.celebration.create({
      data: {
        coupleId: ctx.couple.id,
        challengeId,
        kind: 'CHALLENGE_WON',
        title: `${finished.title} — complete!`,
        body: 'You both made it to the end. That is a proper team effort.',
        emoji: finished.emoji,
      },
    });

    return finished;
  });
}
