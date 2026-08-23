import type { Metadata } from 'next';

import { WorkoutTracker } from '@/features/tracking/WorkoutTracker';
import { prisma } from '@/lib/db/client';
import { requireUser } from '@/lib/permissions';
import { lastNLocalDates, todayLocalDate } from '@/lib/dates';

export const metadata: Metadata = { title: 'Movement' };
export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const user = await requireUser();
  const today = todayLocalDate(user.timezone);
  const week = lastNLocalDates(today, 7);

  const [entries, profile] = await Promise.all([
    prisma.activityEntry.findMany({
      where: { userId: user.id, localDate: { gte: week[0]!, lte: today } },
      orderBy: { loggedAt: 'desc' },
    }),
    prisma.healthProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const byDay = week.map((d) => ({
    localDate: d,
    minutes: entries.filter((e) => e.localDate === d).reduce((s, e) => s + e.durationMinutes, 0),
  }));

  return (
    <WorkoutTracker
      dailyGoal={profile?.dailyActivityGoal ?? 30}
      weeklyGoal={profile?.weeklyWorkoutGoal ?? 4}
      today={today}
      week={byDay}
      timezone={user.timezone}
      initial={entries.map((e) => ({
        id: e.id,
        activityType: e.activityType,
        durationMinutes: e.durationMinutes,
        intensity: e.intensity,
        note: e.note,
        localDate: e.localDate,
        loggedAt: e.loggedAt.toISOString(),
      }))}
    />
  );
}
