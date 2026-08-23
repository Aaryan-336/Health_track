import { randomBytes } from 'node:crypto';
import type { User } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { todayLocalDate } from '@/lib/dates';
import { BadRequest, Conflict, Forbidden, NotFound } from '@/lib/permissions/errors';
import { getCoupleContext, requireActiveCouple } from '@/lib/permissions';
import { recalcCoupleScore } from '@/lib/scores/couple';
import { notify } from '@/features/notifications/service';
import type { checkInSchema, coupleUpdateSchema } from '@/lib/validation/schemas';

const INVITE_TTL_HOURS = 72;

/** Unambiguous alphabet — no O/0 or I/1 to fumble when reading a code aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 6) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/**
 * A user may hold only one live relationship at a time (MVP rule from the data
 * model doc), so creating a space is guarded against duplicates.
 */
export async function createCoupleSpace(user: User, input: { title?: string; anniversary?: string }) {
  const existing = await getCoupleContext(user.id);
  if (existing && existing.couple.status !== 'ENDED') {
    return existing.couple;
  }

  return prisma.coupleRelationship.create({
    data: {
      userAId: user.id,
      status: 'PENDING',
      title: input.title ?? null,
      anniversary: input.anniversary ? new Date(input.anniversary) : null,
    },
  });
}

export async function createInvite(user: User) {
  const ctx = await getCoupleContext(user.id);
  const couple = ctx?.couple ?? (await createCoupleSpace(user, {}));

  if (couple.status === 'ACTIVE') throw Conflict('You are already connected with a partner.');
  if (couple.userAId !== user.id && couple.userBId !== user.id) throw Forbidden();

  // Retire any outstanding codes so only the newest one works.
  await prisma.coupleInvite.updateMany({
    where: { coupleId: couple.id, status: 'PENDING' },
    data: { status: 'REVOKED' },
  });

  let code = generateCode();
  for (let i = 0; i < 5; i += 1) {
    const clash = await prisma.coupleInvite.findUnique({ where: { code } });
    if (!clash) break;
    code = generateCode();
  }

  return prisma.coupleInvite.create({
    data: {
      coupleId: couple.id,
      senderId: user.id,
      code,
      expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3600_000),
    },
  });
}

/**
 * Joining is fully transactional: validating the code, attaching the partner
 * and activating the space must not be able to half-apply.
 */
export async function joinWithCode(user: User, code: string) {
  const existing = await getCoupleContext(user.id);
  if (existing && existing.couple.status === 'ACTIVE') {
    throw Conflict('You are already connected with a partner.');
  }

  return prisma.$transaction(async (tx) => {
    const invite = await tx.coupleInvite.findUnique({
      where: { code },
      include: { couple: true },
    });

    if (!invite || invite.status !== 'PENDING') throw NotFound('That code is not valid.');
    if (invite.expiresAt < new Date()) {
      await tx.coupleInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      throw BadRequest('That code has expired. Ask for a fresh one.');
    }
    if (invite.senderId === user.id) throw BadRequest('That is your own invite code.');
    if (invite.couple.userBId) throw Conflict('That couple space is already full.');
    if (invite.couple.status === 'ENDED') throw BadRequest('That couple space has ended.');

    // If the joiner had an empty pending space of their own, retire it.
    if (existing && !existing.couple.userBId && existing.couple.id !== invite.coupleId) {
      await tx.coupleRelationship.update({
        where: { id: existing.couple.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }

    const couple = await tx.coupleRelationship.update({
      where: { id: invite.coupleId },
      data: { userBId: user.id, status: 'ACTIVE', activatedAt: new Date() },
    });

    await tx.coupleInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    await tx.auditEvent.create({
      data: {
        actorId: user.id,
        eventType: 'couple.joined',
        resourceType: 'couple',
        resourceId: couple.id,
      },
    });

    return couple;
  });
}

export async function updateCouple(user: User, input: z.infer<typeof coupleUpdateSchema>) {
  const ctx = await getCoupleContext(user.id);
  if (!ctx) throw NotFound('You have no couple space.');

  if (input.status === 'ENDED') return endRelationship(user);

  return prisma.coupleRelationship.update({
    where: { id: ctx.couple.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.anniversary !== undefined
        ? { anniversary: input.anniversary ? new Date(input.anniversary) : null }
        : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  });
}

/**
 * Ending a relationship revokes future access immediately, stops every pending
 * partner notification, and leaves each person's own health data untouched.
 */
export async function endRelationship(user: User) {
  const ctx = await getCoupleContext(user.id);
  if (!ctx) throw NotFound('You have no couple space.');
  const coupleId = ctx.couple.id;

  return prisma.$transaction(async (tx) => {
    const couple = await tx.coupleRelationship.update({
      where: { id: coupleId },
      data: { status: 'ENDED', endedAt: new Date() },
    });

    await tx.coupleInvite.updateMany({
      where: { coupleId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    // Stop anything queued that would reach across the ended relationship.
    await tx.scheduledNotification.updateMany({
      where: {
        status: 'PENDING',
        relatedResourceType: { in: ['message', 'letter', 'celebration', 'checkin'] },
        userId: { in: [couple.userAId, couple.userBId].filter(Boolean) as string[] },
      },
      data: { status: 'CANCELLED' },
    });

    await tx.message.updateMany({
      where: { coupleId, deliveredAt: null, scheduledFor: { not: null } },
      data: { deletedAt: new Date() },
    });

    await tx.goal.updateMany({
      where: { coupleId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    await tx.challenge.updateMany({
      where: { coupleId, status: { in: ['ACTIVE', 'UPCOMING'] } },
      data: { status: 'CANCELLED' },
    });

    await tx.auditEvent.create({
      data: {
        actorId: user.id,
        eventType: 'couple.ended',
        resourceType: 'couple',
        resourceId: coupleId,
      },
    });

    return couple;
  });
}

// ─── Daily check-in ─────────────────────────────────────────────────────────

export async function submitCheckIn(user: User, input: z.infer<typeof checkInSchema>) {
  const ctx = await requireActiveCouple(user.id);
  const localDate = todayLocalDate(user.timezone);

  const result = await prisma.$transaction(async (tx) => {
    const previous = await tx.dailyCheckIn.findUnique({
      where: { userId_localDate: { userId: user.id, localDate } },
    });

    const checkIn = await tx.dailyCheckIn.upsert({
      where: { userId_localDate: { userId: user.id, localDate } },
      create: {
        userId: user.id,
        coupleId: ctx.couple.id,
        localDate,
        status: input.status,
        note: input.note ?? null,
      },
      update: { status: input.status, note: input.note ?? null },
    });

    // Challenge progress moves only on the day's *first* DONE check-in, so
    // editing the note later can never inflate the count.
    const countsTowardChallenge = input.status === 'DONE' && previous?.status !== 'DONE';
    if (countsTowardChallenge) {
      await tx.challenge.updateMany({
        where: { coupleId: ctx.couple.id, status: 'ACTIVE', targetRule: 'DAILY_CHECK_IN' },
        data: ctx.side === 'A' ? { progressA: { increment: 1 } } : { progressB: { increment: 1 } },
      });
    }

    const score = await recalcCoupleScore(tx, ctx.couple.id, localDate, user.timezone);
    return { checkIn, coupleScore: score };
  });

  if (input.status === 'DONE' && ctx.partner) {
    await notify({
      userId: ctx.partner.id,
      type: 'DAILY_CHECK_IN',
      dedupeKey: `checkin:${ctx.couple.id}:${user.id}:${localDate}`,
      relatedResourceType: 'checkin',
      relatedResourceId: result.checkIn.id,
      payload: {
        title: `${user.displayName} checked in 💛`,
        body: input.note?.slice(0, 120) || 'Your turn whenever you are ready.',
        url: '/us',
        emoji: '💛',
        background: 'meadow',
      },
    });
  }

  return result;
}

export async function getCoupleOverview(userId: string) {
  const ctx = await getCoupleContext(userId);
  if (!ctx) return null;
  return ctx;
}
