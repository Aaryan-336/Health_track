import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { MessageComposer } from '@/features/messaging/MessageComposer';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Write a note' };
export const dynamic = 'force-dynamic';

export default async function NewMessagePage() {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  if (!ctx || ctx.couple.status !== 'ACTIVE' || !ctx.partner) redirect('/us');

  return <MessageComposer partnerName={ctx.partner.displayName} />;
}
