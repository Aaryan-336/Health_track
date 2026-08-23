import type { NotificationCategory, NotificationType, User } from '@prisma/client';
import { z } from 'zod';

import { prisma, type Tx } from '@/lib/db/client';
import { isWithinQuietHours, nextLocalOccurrence } from '@/lib/dates';
import { sendWebPush, type PushPayload } from '@/lib/notifications/push';
import type { notificationPrefsSchema, subscribeSchema } from '@/lib/validation/schemas';

/**
 * Notification delivery.
 *
 * Three rules shape everything here:
 *  • nothing is sent without an explicit browser subscription,
 *  • the user's category preference and quiet hours are honoured server-side,
 *  • delivery is idempotent — a `dedupeKey` means overlapping worker ticks can
 *    never send the same notification twice.
 */

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'COUPLE_MESSAGES',
  'HEALTH_REMINDERS',
  'GOAL_REMINDERS',
  'HABIT_REMINDERS',
  'CELEBRATIONS',
  'DAILY_CHECK_IN',
];

export const CATEGORY_COPY: Record<NotificationCategory, { label: string; description: string }> = {
  COUPLE_MESSAGES: { label: 'Notes from your partner', description: 'Messages, reactions and letters.' },
  HEALTH_REMINDERS: { label: 'Health nudges', description: 'Water, meals and movement reminders.' },
  GOAL_REMINDERS: { label: 'Goal reminders', description: 'Gentle pushes towards your goals.' },
  HABIT_REMINDERS: { label: 'Habit reminders', description: 'A nudge for the habits you set.' },
  CELEBRATIONS: { label: 'Celebrations', description: 'When something is worth cheering.' },
  DAILY_CHECK_IN: { label: 'Daily check-in', description: 'Your shared daily check-in.' },
};

export const TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
  CUSTOM_MESSAGE: 'COUPLE_MESSAGES',
  COUPLE_UPDATE: 'COUPLE_MESSAGES',
  OPEN_WHEN: 'COUPLE_MESSAGES',
  HEALTH_REMINDER: 'HEALTH_REMINDERS',
  WATER_REMINDER: 'HEALTH_REMINDERS',
  MEAL_REMINDER: 'HEALTH_REMINDERS',
  WORKOUT_REMINDER: 'HEALTH_REMINDERS',
  GOAL_REMINDER: 'GOAL_REMINDERS',
  HABIT_REMINDER: 'HABIT_REMINDERS',
  DAILY_CHECK_IN: 'DAILY_CHECK_IN',
  GOAL_COMPLETED: 'CELEBRATIONS',
  CELEBRATION: 'CELEBRATIONS',
};

export async function ensureNotificationDefaults(userId: string, db: Tx = prisma) {
  await db.notificationPreference.createMany({
    data: NOTIFICATION_CATEGORIES.map((category) => ({
      userId,
      category,
      enabled: true,
      quietStart: '22:00',
      quietEnd: '07:30',
    })),
    skipDuplicates: true,
  });
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

export async function saveSubscription(
  userId: string,
  input: z.infer<typeof subscribeSchema>,
) {
  return prisma.deviceSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      deviceMetadata: (input.deviceMetadata ?? {}) as object,
      active: true,
    },
    // Re-subscribing on another account must move the endpoint, not leak to the old one.
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      active: true,
      lastSeenAt: new Date(),
    },
    select: { id: true, createdAt: true },
  });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await prisma.deviceSubscription.deleteMany({ where: { userId, endpoint } });
}

// ─── Preferences ────────────────────────────────────────────────────────────

export async function getPreferences(userId: string) {
  await ensureNotificationDefaults(userId);
  return prisma.notificationPreference.findMany({ where: { userId }, orderBy: { category: 'asc' } });
}

export async function updatePreferences(
  userId: string,
  input: z.infer<typeof notificationPrefsSchema>,
) {
  await prisma.$transaction(
    input.updates.map((u) =>
      prisma.notificationPreference.upsert({
        where: { userId_category: { userId, category: u.category } },
        create: {
          userId,
          category: u.category,
          enabled: u.enabled,
          quietStart: u.quietStart ?? null,
          quietEnd: u.quietEnd ?? null,
        },
        update: {
          enabled: u.enabled,
          ...(u.quietStart !== undefined ? { quietStart: u.quietStart } : {}),
          ...(u.quietEnd !== undefined ? { quietEnd: u.quietEnd } : {}),
        },
      }),
    ),
  );
  return getPreferences(userId);
}

/** Whether we may deliver right now, given category settings and quiet hours. */
export async function canDeliverNow(
  user: Pick<User, 'id' | 'timezone'>,
  category: NotificationCategory,
  instant = new Date(),
): Promise<{ allowed: boolean; reason?: string; deferUntil?: Date }> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId: user.id, category } },
  });

  if (pref && !pref.enabled) return { allowed: false, reason: 'category_disabled' };

  if (pref && isWithinQuietHours(user.timezone, pref.quietStart, pref.quietEnd, instant)) {
    return {
      allowed: false,
      reason: 'quiet_hours',
      deferUntil: nextLocalOccurrence(user.timezone, pref.quietEnd!, instant),
    };
  }

  return { allowed: true };
}

// ─── Delivery ───────────────────────────────────────────────────────────────

/**
 * Fans a payload out to every active device the user has. Records one delivery
 * row per device and retires subscriptions the push service has dropped.
 */
export async function deliverToUser(
  userId: string,
  payload: PushPayload,
  opts: { scheduledNotificationId?: string } = {},
): Promise<{ sent: number; failed: number }> {
  const subscriptions = await prisma.deviceSubscription.findMany({
    where: { userId, active: true },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const outcome = await sendWebPush(sub, payload);

    await prisma.notificationDelivery.create({
      data: {
        userId,
        subscriptionId: sub.id,
        scheduledNotificationId: opts.scheduledNotificationId ?? null,
        status: outcome.ok ? 'SENT' : outcome.gone ? 'EXPIRED' : 'FAILED',
        sentAt: outcome.ok ? new Date() : null,
        error: outcome.ok ? null : outcome.error.slice(0, 400),
      },
    });

    if (outcome.ok) {
      sent += 1;
      await prisma.deviceSubscription.update({
        where: { id: sub.id },
        data: { lastSeenAt: new Date() },
      });
    } else {
      failed += 1;
      if (outcome.gone) {
        await prisma.deviceSubscription.update({ where: { id: sub.id }, data: { active: false } });
      }
    }
  }

  return { sent, failed };
}

/**
 * The single entry point for "notify this person about this thing". Checks
 * consent and quiet hours, then either sends now or parks it until quiet
 * hours end.
 */
export async function notify(args: {
  userId: string;
  type: NotificationType;
  payload: PushPayload;
  dedupeKey: string;
  relatedResourceType: string;
  relatedResourceId?: string | null;
}): Promise<{ status: 'sent' | 'deferred' | 'suppressed' | 'duplicate' }> {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { id: true, timezone: true },
  });
  if (!user) return { status: 'suppressed' };

  const category = TYPE_TO_CATEGORY[args.type];
  const existing = await prisma.scheduledNotification.findUnique({
    where: { dedupeKey: args.dedupeKey },
  });
  if (existing && existing.status === 'SENT') return { status: 'duplicate' };

  const gate = await canDeliverNow(user, category);

  if (!gate.allowed && gate.reason === 'category_disabled') {
    return { status: 'suppressed' };
  }

  const scheduledFor = gate.allowed ? new Date() : gate.deferUntil ?? new Date();

  const record = await prisma.scheduledNotification.upsert({
    where: { dedupeKey: args.dedupeKey },
    create: {
      userId: args.userId,
      relatedResourceType: args.relatedResourceType,
      relatedResourceId: args.relatedResourceId ?? null,
      notificationType: args.type,
      category,
      scheduledFor,
      payloadTemplate: args.payload as unknown as object,
      dedupeKey: args.dedupeKey,
      status: 'PENDING',
    },
    update: { scheduledFor, payloadTemplate: args.payload as unknown as object },
  });

  if (!gate.allowed) return { status: 'deferred' };

  const { sent } = await deliverToUser(args.userId, args.payload, {
    scheduledNotificationId: record.id,
  });

  await prisma.scheduledNotification.update({
    where: { id: record.id },
    data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
  });

  return { status: sent > 0 ? 'sent' : 'suppressed' };
}

/** Schedules a notification for a future instant. */
export async function scheduleNotification(args: {
  userId: string;
  type: NotificationType;
  payload: PushPayload;
  scheduledFor: Date;
  dedupeKey: string;
  relatedResourceType: string;
  relatedResourceId?: string | null;
}) {
  return prisma.scheduledNotification.upsert({
    where: { dedupeKey: args.dedupeKey },
    create: {
      userId: args.userId,
      relatedResourceType: args.relatedResourceType,
      relatedResourceId: args.relatedResourceId ?? null,
      notificationType: args.type,
      category: TYPE_TO_CATEGORY[args.type],
      scheduledFor: args.scheduledFor,
      payloadTemplate: args.payload as unknown as object,
      dedupeKey: args.dedupeKey,
      status: 'PENDING',
    },
    update: {
      scheduledFor: args.scheduledFor,
      payloadTemplate: args.payload as unknown as object,
      status: 'PENDING',
    },
  });
}

export async function cancelScheduled(dedupeKey: string) {
  await prisma.scheduledNotification.updateMany({
    where: { dedupeKey, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  });
}
