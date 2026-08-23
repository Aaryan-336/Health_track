import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { OnboardingFlow } from '@/features/auth/OnboardingFlow';
import { getSessionUser, getCoupleContext } from '@/lib/permissions';
import { prisma } from '@/lib/db/client';
import { COMMON_TIMEZONES } from '@/lib/dates';

export const metadata: Metadata = { title: 'Welcome' };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');
  if (user.onboardedAt) redirect('/home');

  const [profile, ctx] = await Promise.all([
    prisma.healthProfile.findUnique({ where: { userId: user.id } }),
    getCoupleContext(user.id),
  ]);

  const pendingInvite = ctx
    ? await prisma.coupleInvite.findFirst({
        where: { coupleId: ctx.couple.id, status: 'PENDING', expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: { code: true },
      })
    : null;

  return (
    <OnboardingFlow
      displayName={user.displayName}
      timezone={user.timezone}
      timezones={COMMON_TIMEZONES}
      waterGoalMl={profile?.dailyWaterGoalMl ?? 2000}
      glassSizeMl={profile?.glassSizeMl ?? 250}
      activityGoal={profile?.dailyActivityGoal ?? 30}
      theme={user.themePreference.toLowerCase()}
      connected={ctx?.couple.status === 'ACTIVE'}
      partnerName={ctx?.partner?.displayName ?? null}
      existingCode={pendingInvite?.code ?? null}
    />
  );
}
