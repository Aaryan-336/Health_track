import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { NotFound } from '@/lib/permissions/errors';
import { nextLocalOccurrence } from '@/lib/dates';
import { scheduleNotification } from '@/features/notifications/service';
import { reminderCreateSchema } from '@/lib/validation/schemas';

/** User-defined recurring reminders, scheduled in their own local time. */

export const GET = route(async () => {
  const user = await requireUser();
  const reminders = await prisma.scheduledNotification.findMany({
    where: {
      userId: user.id,
      relatedResourceType: 'reminder',
      status: { in: ['PENDING', 'SENT'] },
    },
    orderBy: { scheduledFor: 'asc' },
  });
  return ok({ reminders });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = reminderCreateSchema.parse(await jsonBody(req));

  const scheduledFor = nextLocalOccurrence(user.timezone, input.time);

  const reminder = await scheduleNotification({
    userId: user.id,
    type: input.notificationType,
    scheduledFor,
    dedupeKey: `reminder:${user.id}:${input.notificationType}:${input.time}`,
    relatedResourceType: 'reminder',
    relatedResourceId: input.relatedResourceId ?? null,
    payload: {
      title: input.title,
      body: input.body,
      url: '/home',
      emoji: '⏰',
      background: 'meadow',
    },
  });

  return ok(reminder, 201);
});

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw NotFound('Which reminder?');

  const deleted = await prisma.scheduledNotification.deleteMany({
    where: { id, userId: user.id, relatedResourceType: 'reminder' },
  });
  if (deleted.count === 0) throw NotFound('That reminder is gone.');

  return ok({ deleted: true });
});
