import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { MemoriesScreen } from '@/features/couple/MemoriesScreen';
import { listMemories } from '@/features/memories/service';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Memories' };
export const dynamic = 'force-dynamic';

export default async function MemoriesPage() {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  if (!ctx || ctx.couple.status !== 'ACTIVE' || !ctx.partner) redirect('/us');

  const memories = await listMemories(user.id);

  return (
    <MemoriesScreen
      memories={memories.map((m) => ({
        id: m.id,
        caption: m.caption,
        memoryDate: m.memoryDate.toISOString(),
        creatorName: m.creator.displayName,
        mine: m.creatorId === user.id,
        media: m.media.map((image) => ({ id: image.id })),
      }))}
    />
  );
}
