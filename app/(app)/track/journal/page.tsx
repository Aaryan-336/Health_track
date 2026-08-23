import type { Metadata } from 'next';

import { JournalScreen } from '@/features/tracking/JournalScreen';
import { prisma } from '@/lib/db/client';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Journal' };
export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  const user = await requireUser();

  const [entries, ctx] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    getCoupleContext(user.id),
  ]);

  return (
    <JournalScreen
      partnerName={ctx?.couple.status === 'ACTIVE' ? (ctx.partner?.displayName ?? null) : null}
      initial={entries.map((e) => ({
        id: e.id,
        title: e.title,
        content: e.content,
        prompt: e.prompt,
        isShared: e.isShared,
        localDate: e.localDate,
        createdAt: e.createdAt.toISOString(),
      }))}
    />
  );
}
