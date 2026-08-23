import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { MessageExperience } from '@/features/messaging/MessageExperience';
import { getMessageForUser } from '@/features/messaging/service';
import { requireUser } from '@/lib/permissions';
import { AppError } from '@/lib/permissions/errors';

export const metadata: Metadata = { title: 'A note for you' };
export const dynamic = 'force-dynamic';

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let message;
  try {
    message = await getMessageForUser(id, user.id);
  } catch (error) {
    // A note that isn't yours is indistinguishable from one that doesn't exist.
    if (error instanceof AppError) notFound();
    throw error;
  }

  const isRecipient = message.recipientId === user.id;

  return (
    <MessageExperience
      viewerId={user.id}
      isRecipient={isRecipient}
      message={{
        id: message.id,
        body: message.body,
        messageType: message.messageType,
        background: message.background,
        createdAt: message.createdAt.toISOString(),
        openedAt: message.openedAt?.toISOString() ?? null,
        sender: message.sender,
        recipient: message.recipient,
        reactions: message.reactions.map((r) => ({
          id: r.id,
          reaction: r.reaction,
          userId: r.userId,
          userName: r.user.displayName,
        })),
      }}
    />
  );
}
