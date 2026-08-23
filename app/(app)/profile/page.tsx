import type { Metadata } from 'next';

import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { prisma } from '@/lib/db/client';
import { todayLocalDate } from '@/lib/dates';
import { getCoupleContext, requireUser } from '@/lib/permissions';
import { computeActivityStreak } from '@/lib/scores/streaks';

export const metadata: Metadata = { title: 'You' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireUser();
  const today = todayLocalDate(user.timezone);

  const [ctx, streak, sharedCategories, notificationsOn, devices] = await Promise.all([
    getCoupleContext(user.id),
    computeActivityStreak(prisma, user.id, today),
    prisma.sharingPreference.count({ where: { userId: user.id, shareEnabled: true } }),
    prisma.notificationPreference.count({ where: { userId: user.id, enabled: true } }),
    prisma.deviceSubscription.count({ where: { userId: user.id, active: true } }),
  ]);

  const daysHere = Math.max(
    1,
    Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000) + 1,
  );

  return (
    <ProfileScreen
      displayName={user.displayName}
      email={user.email}
      avatarUrl={user.avatarUrl}
      timezone={user.timezone}
      streak={streak.current}
      longestStreak={streak.longest}
      daysHere={daysHere}
      sharedCategories={sharedCategories}
      notificationsOn={notificationsOn}
      devices={devices}
      partnerName={ctx?.couple.status === 'ACTIVE' ? (ctx.partner?.displayName ?? null) : null}
      coupleStatus={ctx?.couple.status ?? null}
    />
  );
}
