import type { Metadata } from 'next';

import { HabitsScreen } from '@/features/tracking/HabitsScreen';
import { prisma } from '@/lib/db/client';
import { requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';
import { computeHabitStreak } from '@/lib/scores/streaks';
import { isHabitScheduled } from '@/lib/scores/health';

export const metadata: Metadata = { title: 'Habits' };
export const dynamic = 'force-dynamic';

export default async function HabitsPage() {
  const user = await requireUser();
  const today = todayLocalDate(user.timezone);

  const [habits, completions] = await Promise.all([
    prisma.habit.findMany({ where: { ownerId: user.id, active: true }, orderBy: { createdAt: 'asc' } }),
    prisma.habitCompletion.findMany({ where: { userId: user.id, localDate: today } }),
  ]);

  const done = new Set(completions.map((c) => c.habitId));

  const withStreaks = await Promise.all(
    habits.map(async (h) => ({
      id: h.id,
      title: h.title,
      colour: h.colour,
      frequencyRule: h.frequencyRule,
      completedToday: done.has(h.id),
      scheduledToday: isHabitScheduled(h.frequencyRule, today),
      streak: (await computeHabitStreak(prisma, h.id, today)).current,
    })),
  );

  return <HabitsScreen initial={withStreaks} />;
}
