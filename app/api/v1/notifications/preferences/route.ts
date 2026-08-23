import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { getPreferences, updatePreferences } from '@/features/notifications/service';
import { notificationPrefsSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  const [preferences, devices] = await Promise.all([
    getPreferences(user.id),
    prisma.deviceSubscription.count({ where: { userId: user.id, active: true } }),
  ]);
  return ok({ preferences, activeDevices: devices });
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = notificationPrefsSchema.parse(await jsonBody(req));
  return ok({ preferences: await updatePreferences(user.id, input) });
});
