import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { MessagesScreen } from '@/features/messaging/MessagesScreen';
import { listMessages } from '@/features/messaging/service';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Notes' };
export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  if (!ctx || ctx.couple.status !== 'ACTIVE' || !ctx.partner) redirect('/us');

  const messages = await listMessages(user.id);

  return (
    <MessagesScreen
      viewerId={user.id}
      partnerName={ctx.partner.displayName}
      messages={messages.map((m) => ({
        id: m.id,
        body: m.body,
        messageType: m.messageType,
        background: m.background,
        createdAt: m.createdAt.toISOString(),
        scheduledFor: m.scheduledFor?.toISOString() ?? null,
        deliveredAt: m.deliveredAt?.toISOString() ?? null,
        openedAt: m.openedAt?.toISOString() ?? null,
        senderId: m.senderId,
        senderName: m.sender.displayName,
        reactions: m.reactions.map((r) => ({ id: r.id, reaction: r.reaction, userId: r.userId })),
      }))}
    />
  );
}
