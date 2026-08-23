import { prisma } from '@/lib/db/client';
import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { BadRequest } from '@/lib/permissions/errors';
import { deliverToUser } from '@/features/notifications/service';
import { pushConfigured } from '@/lib/env';

export const POST = route(async () => {
  const user = await requireUser();

  if (!pushConfigured()) throw BadRequest('Push is not configured on this server.');

  const devices = await prisma.deviceSubscription.count({ where: { userId: user.id, active: true } });
  if (devices === 0) {
    throw BadRequest('Turn on notifications for this device first.');
  }

  // A test send deliberately bypasses quiet hours — the user asked for it.
  const result = await deliverToUser(user.id, {
    title: 'Hello from Bloom 🌸',
    body: 'Notifications are working beautifully. Tap to have a look.',
    url: '/home',
    tag: 'bloom-test',
    emoji: '🌸',
    background: 'sunrise',
  });

  return ok(result);
});
