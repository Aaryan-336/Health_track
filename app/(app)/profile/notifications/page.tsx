import type { Metadata } from 'next';

import { NotificationsScreen } from '@/features/profile/NotificationsScreen';
import { CATEGORY_COPY, getPreferences } from '@/features/notifications/service';
import { prisma } from '@/lib/db/client';
import { publicEnv, pushConfigured } from '@/lib/env';
import { requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await requireUser();

  const [preferences, devices, reminders] = await Promise.all([
    getPreferences(user.id),
    prisma.deviceSubscription.count({ where: { userId: user.id, active: true } }),
    prisma.scheduledNotification.findMany({
      where: { userId: user.id, relatedResourceType: 'reminder', status: { in: ['PENDING', 'SENT'] } },
      orderBy: { scheduledFor: 'asc' },
    }),
  ]);

  return (
    <NotificationsScreen
      configured={pushConfigured()}
      vapidPublicKey={publicEnv.vapidPublicKey}
      devices={devices}
      timezone={user.timezone}
      preferences={preferences.map((p) => ({
        category: p.category,
        label: CATEGORY_COPY[p.category].label,
        description: CATEGORY_COPY[p.category].description,
        enabled: p.enabled,
        quietStart: p.quietStart,
        quietEnd: p.quietEnd,
      }))}
      reminders={reminders.map((r) => ({
        id: r.id,
        type: r.notificationType,
        scheduledFor: r.scheduledFor.toISOString(),
        title: (r.payloadTemplate as { title?: string }).title ?? 'Reminder',
        body: (r.payloadTemplate as { body?: string }).body ?? '',
      }))}
    />
  );
}
