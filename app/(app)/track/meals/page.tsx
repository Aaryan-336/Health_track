import type { Metadata } from 'next';

import { MealTracker } from '@/features/tracking/MealTracker';
import { prisma } from '@/lib/db/client';
import { requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';

export const metadata: Metadata = { title: 'Meals' };
export const dynamic = 'force-dynamic';

export default async function MealsPage() {
  const user = await requireUser();
  const today = todayLocalDate(user.timezone);

  const [entries, profile] = await Promise.all([
    prisma.mealEntry.findMany({ where: { userId: user.id, localDate: today }, orderBy: { loggedAt: 'asc' } }),
    prisma.healthProfile.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <MealTracker
      goal={profile?.dailyMealGoal ?? 3}
      timezone={user.timezone}
      initial={entries.map((e) => ({
        id: e.id,
        mealType: e.mealType,
        description: e.description,
        feelsGood: e.feelsGood,
        loggedAt: e.loggedAt.toISOString(),
      }))}
    />
  );
}
