import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PromisesScreen } from '@/features/couple/PromisesScreen';
import { listPromises } from '@/features/couple/promises';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Our promises' };
export const dynamic = 'force-dynamic';

export default async function PromisesPage() {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  if (!ctx || ctx.couple.status !== 'ACTIVE' || !ctx.partner) redirect('/us');

  const promises = await listPromises(user.id);

  return (
    <PromisesScreen
      partnerName={ctx.partner.displayName}
      promises={promises.map((p) => ({
        id: p.id,
        title: p.title,
        promiseText: p.promiseText,
        emoji: p.emoji,
        status: p.status,
        acceptedByMe: p.acceptedByMe,
        acceptedByPartner: p.acceptedByPartner,
        creatorName: p.creator.displayName,
        createdByMe: p.creatorId === user.id,
      }))}
    />
  );
}
