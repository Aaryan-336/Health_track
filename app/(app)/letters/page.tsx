import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LettersScreen } from '@/features/messaging/LettersScreen';
import { listLetters } from '@/features/messaging/service';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Open when…' };
export const dynamic = 'force-dynamic';

export default async function LettersPage() {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  if (!ctx || ctx.couple.status !== 'ACTIVE' || !ctx.partner) redirect('/us');

  const letters = await listLetters(user.id);

  return (
    <LettersScreen
      partnerName={ctx.partner.displayName}
      letters={letters.map((l) => ({
        id: l.id,
        triggerLabel: l.triggerLabel,
        title: l.title,
        // A sealed letter's body never leaves the server until it is opened.
        body: l.body,
        background: l.background,
        status: l.status,
        sealed: l.sealed,
        writtenByMe: l.writtenByMe,
        senderName: l.sender.displayName,
        createdAt: l.createdAt.toISOString(),
        openedAt: l.openedAt?.toISOString() ?? null,
      }))}
    />
  );
}
