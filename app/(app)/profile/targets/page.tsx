import type { Metadata } from 'next';

import { TargetsScreen } from '@/features/profile/TargetsScreen';
import { prisma } from '@/lib/db/client';
import { requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Daily targets' };
export const dynamic = 'force-dynamic';

export default async function TargetsPage() {
  const user = await requireUser();
  const profile = await prisma.healthProfile.findUnique({ where: { userId: user.id } });

  return (
    <TargetsScreen
      waterGoalMl={profile?.dailyWaterGoalMl ?? 2000}
      glassSizeMl={profile?.glassSizeMl ?? 250}
      mealGoal={profile?.dailyMealGoal ?? 3}
      weeklyWorkoutGoal={profile?.weeklyWorkoutGoal ?? 3}
      activityGoal={profile?.dailyActivityGoal ?? 30}
    />
  );
}
