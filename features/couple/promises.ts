import type { User } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { BadRequest, Forbidden, NotFound } from '@/lib/permissions/errors';
import { requireActiveCouple } from '@/lib/permissions';
import { notify } from '@/features/notifications/service';
import type { promiseCreateSchema } from '@/lib/validation/schemas';

/**
 * "Our Promise" commitments.
 *
 * A promise becomes active only when *both* partners have accepted it, each
 * with their own action. One person can never accept on behalf of both.
 */

const promiseInclude = {
  creator: { select: { id: true, displayName: true, avatarUrl: true } },
} as const;

export async function listPromises(userId: string) {
  const ctx = await requireActiveCouple(userId);

  const promises = await prisma.promise.findMany({
    where: { coupleId: ctx.couple.id },
    include: promiseInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  return promises.map((p) => ({
    ...p,
    acceptedByMe: ctx.side === 'A' ? Boolean(p.acceptedByUserAAt) : Boolean(p.acceptedByUserBAt),
    acceptedByPartner: ctx.side === 'A' ? Boolean(p.acceptedByUserBAt) : Boolean(p.acceptedByUserAAt),
  }));
}

export async function createPromise(user: User, input: z.infer<typeof promiseCreateSchema>) {
  const ctx = await requireActiveCouple(user.id);

  // Proposing counts as the proposer's own acceptance — but only their own.
  const acceptedField = ctx.side === 'A' ? { acceptedByUserAAt: new Date() } : { acceptedByUserBAt: new Date() };

  const promise = await prisma.promise.create({
    data: {
      coupleId: ctx.couple.id,
      creatorId: user.id,
      title: input.title,
      promiseText: input.promiseText,
      emoji: input.emoji,
      trackingRule: input.trackingRule ?? null,
      status: 'PROPOSED',
      ...acceptedField,
    },
    include: promiseInclude,
  });

  await notify({
    userId: ctx.partner!.id,
    type: 'COUPLE_UPDATE',
    dedupeKey: `promise:${promise.id}`,
    relatedResourceType: 'promise',
    relatedResourceId: promise.id,
    payload: {
      title: `${user.displayName} made a promise`,
      body: promise.title,
      url: '/us/promises',
      emoji: promise.emoji,
      background: 'petal',
    },
  });

  return promise;
}

export async function actOnPromise(
  user: User,
  promiseId: string,
  action: 'ACCEPT' | 'COMPLETE' | 'ARCHIVE',
) {
  const ctx = await requireActiveCouple(user.id);

  const promise = await prisma.promise.findUnique({ where: { id: promiseId } });
  if (!promise) throw NotFound('That promise is gone.');
  if (promise.coupleId !== ctx.couple.id) throw Forbidden('That promise is not yours.');

  if (action === 'ARCHIVE') {
    return prisma.promise.update({
      where: { id: promiseId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
      include: promiseInclude,
    });
  }

  if (action === 'COMPLETE') {
    if (promise.status !== 'ACTIVE') throw BadRequest('Both of you need to accept this first.');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.promise.update({
        where: { id: promiseId },
        data: { status: 'COMPLETED', completedAt: new Date() },
        include: promiseInclude,
      });
      await tx.celebration.create({
        data: {
          coupleId: ctx.couple.id,
          promiseId,
          kind: 'PROMISE_KEPT',
          title: 'A promise kept',
          body: updated.title,
          emoji: updated.emoji,
        },
      });
      return updated;
    });
  }

  // ACCEPT — each partner writes only their own column.
  const alreadyAccepted =
    ctx.side === 'A' ? promise.acceptedByUserAAt : promise.acceptedByUserBAt;
  if (alreadyAccepted) return promise;

  const updated = await prisma.$transaction(async (tx) => {
    const withMine = await tx.promise.update({
      where: { id: promiseId },
      data: ctx.side === 'A' ? { acceptedByUserAAt: new Date() } : { acceptedByUserBAt: new Date() },
    });

    const bothAccepted = Boolean(withMine.acceptedByUserAAt && withMine.acceptedByUserBAt);
    if (!bothAccepted || withMine.status !== 'PROPOSED') return withMine;

    return tx.promise.update({ where: { id: promiseId }, data: { status: 'ACTIVE' } });
  });

  if (updated.status === 'ACTIVE') {
    await notify({
      userId: ctx.partner!.id,
      type: 'COUPLE_UPDATE',
      dedupeKey: `promise-active:${promiseId}`,
      relatedResourceType: 'promise',
      relatedResourceId: promiseId,
      payload: {
        title: 'Your promise is official 🤍',
        body: updated.title,
        url: '/us/promises',
        emoji: updated.emoji,
        background: 'petal',
      },
    });
  }

  return updated;
}
