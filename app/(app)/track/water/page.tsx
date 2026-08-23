import type { Metadata } from 'next';

import { WaterTracker } from '@/features/tracking/WaterTracker';
import { requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';
import { getWaterDay } from '@/features/tracking/service';

export const metadata: Metadata = { title: 'Water' };
export const dynamic = 'force-dynamic';

export default async function WaterPage() {
  const user = await requireUser();
  const today = todayLocalDate(user.timezone);
  const day = await getWaterDay(user.id, today);

  return (
    <WaterTracker
      initial={{
        totalMl: day.totalMl,
        goalMl: day.goalMl,
        glassSizeMl: day.glassSizeMl,
        entries: day.entries.map((e) => ({
          id: e.id,
          amountMl: e.amountMl,
          loggedAt: e.loggedAt.toISOString(),
        })),
      }}
      firstName={user.displayName.split(' ')[0] ?? user.displayName}
      timezone={user.timezone}
    />
  );
}
