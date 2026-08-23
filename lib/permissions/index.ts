import { cache } from 'react';
import type { CoupleRelationship, User } from '@prisma/client';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/client';
import { Forbidden, NotFound, Unauthorized } from './errors';

export * from './errors';

/**
 * Every server entry point funnels through here. Nothing trusts a client-sent
 * user id — the identity always comes from the signed session cookie.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) return null;
  return user;
});

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw Unauthorized();
  return user;
}

export type CoupleContext = {
  couple: CoupleRelationship;
  partner: User | null;
  /** Which side of the relationship the current user sits on. */
  side: 'A' | 'B';
};

/** The current user's active (or pending) relationship, if any. */
export const getCoupleContext = cache(
  async (userId: string): Promise<CoupleContext | null> => {
    const couple = await prisma.coupleRelationship.findFirst({
      where: {
        status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!couple) return null;

    const side: 'A' | 'B' = couple.userAId === userId ? 'A' : 'B';
    const partnerId = side === 'A' ? couple.userBId : couple.userAId;
    const partner = partnerId
      ? await prisma.user.findUnique({ where: { id: partnerId } })
      : null;

    return { couple, partner: partner?.deletedAt ? null : partner, side };
  },
);

/** Requires a *fully active* couple — both partners present and connected. */
export async function requireActiveCouple(userId: string): Promise<CoupleContext> {
  const ctx = await getCoupleContext(userId);
  if (!ctx) throw NotFound('You are not connected with a partner yet.');
  if (ctx.couple.status !== 'ACTIVE' || !ctx.partner) {
    throw Forbidden('Your couple space is not active yet.');
  }
  return ctx;
}

/** Confirms the user is a live member of the given couple. */
export async function assertCoupleMember(
  coupleId: string,
  userId: string,
): Promise<CoupleRelationship> {
  const couple = await prisma.coupleRelationship.findUnique({ where: { id: coupleId } });
  if (!couple) throw NotFound('Couple space not found.');

  const isMember = couple.userAId === userId || couple.userBId === userId;
  if (!isMember) throw Forbidden('This is not your couple space.');
  if (couple.status === 'ENDED') throw Forbidden('This couple space has ended.');

  return couple;
}

/** Ownership check for personal resources. */
export function assertOwner(ownerId: string | null | undefined, userId: string): void {
  if (!ownerId || ownerId !== userId) throw Forbidden();
}
