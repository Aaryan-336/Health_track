import type { Metadata } from 'next';

import { MoodTracker } from '@/features/tracking/MoodTracker';
import { prisma } from '@/lib/db/client';
import { getCoupleContext, requireUser } from '@/lib/permissions';
import { getSharingMap } from '@/lib/permissions/sharing';
import { lastNLocalDates, todayLocalDate } from '@/lib/dates';

export const metadata: Metadata = { title: 'Mood' };
export const dynamic = 'force-dynamic';

export default async function MoodPage() {
  const user = await requireUser();
  const today = todayLocalDate(user.timezone);
  const range = lastNLocalDates(today, 14);

  const [entries, ctx, sharing] = await Promise.all([
    prisma.moodEntry.findMany({
      where: { userId: user.id, localDate: { gte: range[0]!, lte: today } },
      orderBy: { loggedAt: 'desc' },
    }),
    getCoupleContext(user.id),
    getSharingMap(user.id),
  ]);

  return (
    <MoodTracker
      hasPartner={ctx?.couple.status === 'ACTIVE' && Boolean(ctx.partner)}
      partnerName={ctx?.partner?.displayName ?? null}
      moodSharingOn={sharing.MOOD_STATUS !== 'NONE'}
      today={today}
      initial={entries.map((e) => ({
        id: e.id,
        moodValue: e.moodValue,
        stressValue: e.stressValue,
        note: e.note,
        shareMode: e.shareMode,
        localDate: e.localDate,
        loggedAt: e.loggedAt.toISOString(),
      }))}
    />
  );
}
