import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { LetterExperience } from '@/features/messaging/LetterExperience';
import { prisma } from '@/lib/db/client';
import { requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'A letter for you' };
export const dynamic = 'force-dynamic';

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const letter = await prisma.openWhenLetter.findUnique({
    where: { id },
    include: { sender: { select: { displayName: true } } },
  });

  if (!letter || letter.deletedAt) notFound();

  const isRecipient = letter.recipientId === user.id;
  const isSender = letter.senderId === user.id;
  if (!isRecipient && !isSender) notFound();

  // The sender may only re-read a letter the recipient has already opened —
  // otherwise the surprise would be spoiled from their own device.
  if (isSender && letter.status === 'SEALED') notFound();

  return (
    <LetterExperience
      isRecipient={isRecipient}
      letter={{
        id: letter.id,
        triggerLabel: letter.triggerLabel,
        title: letter.title,
        body: letter.body,
        background: letter.background,
        status: letter.status,
        senderName: letter.sender.displayName,
        createdAt: letter.createdAt.toISOString(),
      }}
    />
  );
}
