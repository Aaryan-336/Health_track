import { prisma } from '@/lib/db/client';
import { todayLocalDate } from '@/lib/dates';
import type { PushPayload } from '@/lib/notifications/push';
import { recalcCoupleScore } from '@/lib/scores/couple';
import { recalcHealthScore } from '@/lib/scores/health';
import { buildMessagePayload } from '@/features/messaging/service';
import { canDeliverNow, deliverToUser } from './service';

/**
 * Background work, run by the notification worker or a cron ping.
 *
 * Each pass is idempotent: a scheduled row is claimed by flipping its status
 * before delivery, so an overlapping tick cannot send the same push twice.
 */

export type TickResult = {
  messagesDelivered: number;
  notificationsSent: number;
  notificationsDeferred: number;
  scoresRecalculated: number;
  coupleScoresRecalculated: number;
};

const BATCH = 100;

/** Scheduled messages that have come due become real, delivered messages. */
async function deliverDueMessages(now: Date): Promise<number> {
  const due = await prisma.message.findMany({
    where: {
      deliveredAt: null,
      deletedAt: null,
      scheduledFor: { not: null, lte: now },
    },
    include: { sender: { select: { displayName: true } } },
    take: BATCH,
  });

  let delivered = 0;

  for (const message of due) {
    // Claim it first — a concurrent tick will match zero rows and skip.
    const claim = await prisma.message.updateMany({
      where: { id: message.id, deliveredAt: null },
      data: { deliveredAt: now },
    });
    if (claim.count === 0) continue;

    await prisma.scheduledNotification.updateMany({
      where: { dedupeKey: `message:${message.id}`, status: 'PENDING' },
      data: { scheduledFor: now },
    });

    delivered += 1;
  }

  return delivered;
}

/** Sends every push that is due, honouring quiet hours and category settings. */
async function sendDueNotifications(now: Date): Promise<{ sent: number; deferred: number }> {
  const due = await prisma.scheduledNotification.findMany({
    where: { status: 'PENDING', scheduledFor: { lte: now } },
    include: { user: { select: { id: true, timezone: true } } },
    orderBy: { scheduledFor: 'asc' },
    take: BATCH,
  });

  let sent = 0;
  let deferred = 0;

  for (const row of due) {
    const gate = await canDeliverNow(row.user, row.category, now);

    if (!gate.allowed) {
      if (gate.reason === 'category_disabled') {
        await prisma.scheduledNotification.update({
          where: { id: row.id },
          data: { status: 'CANCELLED', lastError: 'category_disabled' },
        });
      } else {
        await prisma.scheduledNotification.update({
          where: { id: row.id },
          data: { scheduledFor: gate.deferUntil ?? new Date(now.getTime() + 30 * 60_000) },
        });
        deferred += 1;
      }
      continue;
    }

    // Claim before sending so a parallel tick cannot double-deliver.
    const claim = await prisma.scheduledNotification.updateMany({
      where: { id: row.id, status: 'PENDING' },
      data: { status: 'SENT', sentAt: now, attempts: { increment: 1 } },
    });
    if (claim.count === 0) continue;

    const result = await deliverToUser(row.userId, row.payloadTemplate as unknown as PushPayload, {
      scheduledNotificationId: row.id,
    });

    if (result.sent === 0 && result.failed > 0) {
      await prisma.scheduledNotification.update({
        where: { id: row.id },
        data: { status: 'FAILED', lastError: 'all device deliveries failed' },
      });
    } else {
      sent += result.sent;
    }
  }

  return { sent, deferred };
}

/**
 * Nightly-safe recalculation. Scores are derived data, so re-running this can
 * only ever reproduce the same numbers from the same logs.
 */
async function recalculateScores(): Promise<{ users: number; couples: number }> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, onboardedAt: { not: null } },
    select: { id: true, timezone: true },
  });

  for (const user of users) {
    const localDate = todayLocalDate(user.timezone);
    await prisma.$transaction((tx) => recalcHealthScore(tx, user.id, localDate, user.timezone));
  }

  const couples = await prisma.coupleRelationship.findMany({
    where: { status: 'ACTIVE' },
    include: { userA: { select: { timezone: true } } },
  });

  for (const couple of couples) {
    const tz = couple.userA.timezone;
    const localDate = todayLocalDate(tz);
    await prisma.$transaction((tx) => recalcCoupleScore(tx, couple.id, localDate, tz));
  }

  return { users: users.length, couples: couples.length };
}

export async function runTick(opts: { recalculate?: boolean } = {}): Promise<TickResult> {
  const now = new Date();

  const messagesDelivered = await deliverDueMessages(now);
  const { sent, deferred } = await sendDueNotifications(now);

  let scores = { users: 0, couples: 0 };
  if (opts.recalculate) scores = await recalculateScores();

  return {
    messagesDelivered,
    notificationsSent: sent,
    notificationsDeferred: deferred,
    scoresRecalculated: scores.users,
    coupleScoresRecalculated: scores.couples,
  };
}

/** Re-arms a daily reminder for the next day after it fires. */
export async function rollDailyReminders(now = new Date()): Promise<number> {
  const fired = await prisma.scheduledNotification.findMany({
    where: {
      status: 'SENT',
      relatedResourceType: 'reminder',
      sentAt: { lte: now },
    },
    include: { user: { select: { timezone: true } } },
    take: BATCH,
  });

  let rolled = 0;
  for (const row of fired) {
    const next = new Date(row.scheduledFor.getTime() + 24 * 3600_000);
    if (next <= now) continue;

    await prisma.scheduledNotification.update({
      where: { id: row.id },
      data: { status: 'PENDING', scheduledFor: next, sentAt: null },
    });
    rolled += 1;
  }
  return rolled;
}

export { buildMessagePayload };
