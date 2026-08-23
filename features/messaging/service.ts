import type { User } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { BadRequest, Forbidden, NotFound } from '@/lib/permissions/errors';
import { requireActiveCouple } from '@/lib/permissions';
import { notify, scheduleNotification } from '@/features/notifications/service';
import type {
  letterCreateSchema,
  messageCreateSchema,
  reactionSchema,
} from '@/lib/validation/schemas';

/**
 * Messages and Open When letters.
 *
 * The system notification is deliberately minimal — the OS owns its appearance.
 * The `url` deep-links into the app's own full-screen message experience, which
 * is where the cute presentation actually lives.
 */

const messageInclude = {
  sender: { select: { id: true, displayName: true, avatarUrl: true } },
  recipient: { select: { id: true, displayName: true, avatarUrl: true } },
  reactions: { include: { user: { select: { id: true, displayName: true } } } },
} as const;

export async function listMessages(userId: string, limit = 50) {
  const ctx = await requireActiveCouple(userId);

  return prisma.message.findMany({
    where: {
      coupleId: ctx.couple.id,
      deletedAt: null,
      // A scheduled message stays invisible to the recipient until it is due.
      OR: [{ senderId: userId }, { recipientId: userId, deliveredAt: { not: null } }],
    },
    include: messageInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getMessageForUser(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });
  if (!message || message.deletedAt) throw NotFound('That note is gone.');

  const isSender = message.senderId === userId;
  const isRecipient = message.recipientId === userId;
  if (!isSender && !isRecipient) throw Forbidden('That note is not for you.');
  if (isRecipient && !message.deliveredAt) throw NotFound('That note has not arrived yet.');

  return message;
}

export async function sendMessage(user: User, input: z.infer<typeof messageCreateSchema>) {
  const ctx = await requireActiveCouple(user.id);
  const partner = ctx.partner!;

  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  if (scheduledFor && scheduledFor.getTime() < Date.now() - 60_000) {
    throw BadRequest('Pick a time in the future for a scheduled note.');
  }

  const message = await prisma.message.create({
    data: {
      coupleId: ctx.couple.id,
      senderId: user.id,
      recipientId: partner.id,
      body: input.body,
      messageType: input.messageType,
      background: input.background,
      scheduledFor,
      deliveredAt: scheduledFor ? null : new Date(),
    },
    include: messageInclude,
  });

  if (scheduledFor) {
    await scheduleNotification({
      userId: partner.id,
      type: 'CUSTOM_MESSAGE',
      scheduledFor,
      dedupeKey: `message:${message.id}`,
      relatedResourceType: 'message',
      relatedResourceId: message.id,
      payload: buildMessagePayload(user.displayName, message.body, message.id, message.background),
    });
  } else {
    await notify({
      userId: partner.id,
      type: 'CUSTOM_MESSAGE',
      dedupeKey: `message:${message.id}`,
      relatedResourceType: 'message',
      relatedResourceId: message.id,
      payload: buildMessagePayload(user.displayName, message.body, message.id, message.background),
    });
  }

  return message;
}

export function buildMessagePayload(
  senderName: string,
  body: string,
  messageId: string,
  background: string,
) {
  return {
    title: `${senderName} sent you something 💌`,
    body: body.length > 110 ? `${body.slice(0, 107)}…` : body,
    url: `/message/${messageId}`,
    tag: `message-${messageId}`,
    emoji: '💌',
    background,
  };
}

/** Marks a delivered message as opened. Only the recipient can do this. */
export async function markMessageOpened(messageId: string, userId: string) {
  const message = await getMessageForUser(messageId, userId);
  if (message.recipientId !== userId || message.openedAt) return message;

  return prisma.message.update({
    where: { id: messageId },
    data: { openedAt: new Date() },
    include: messageInclude,
  });
}

export async function reactToMessage(
  user: User,
  messageId: string,
  input: z.infer<typeof reactionSchema>,
) {
  const message = await getMessageForUser(messageId, user.id);

  const reaction = await prisma.messageReaction.upsert({
    where: { messageId_userId: { messageId, userId: user.id } },
    create: { messageId, userId: user.id, reaction: input.reaction },
    update: { reaction: input.reaction },
  });

  const otherId = message.senderId === user.id ? message.recipientId : message.senderId;
  if (otherId !== user.id) {
    await notify({
      userId: otherId,
      type: 'COUPLE_UPDATE',
      dedupeKey: `reaction:${messageId}:${user.id}:${input.reaction}`,
      relatedResourceType: 'message',
      relatedResourceId: messageId,
      payload: {
        title: `${user.displayName} reacted ${input.reaction}`,
        body: message.body.slice(0, 80),
        url: `/message/${messageId}`,
        emoji: input.reaction,
        background: message.background,
      },
    });
  }

  return reaction;
}

export async function removeReaction(userId: string, messageId: string) {
  await getMessageForUser(messageId, userId);
  await prisma.messageReaction.deleteMany({ where: { messageId, userId } });
}

// ─── Open When letters ──────────────────────────────────────────────────────

export async function listLetters(userId: string) {
  const ctx = await requireActiveCouple(userId);

  const letters = await prisma.openWhenLetter.findMany({
    where: { coupleId: ctx.couple.id, deletedAt: null },
    include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // A sealed letter written *by* you shows its own text; one written *for* you
  // stays sealed until you choose to open it.
  return letters.map((letter) => {
    const isRecipient = letter.recipientId === userId;
    const sealed = isRecipient && letter.status === 'SEALED';
    return {
      ...letter,
      body: sealed ? null : letter.body,
      sealed,
      writtenByMe: letter.senderId === userId,
    };
  });
}

export async function createLetter(user: User, input: z.infer<typeof letterCreateSchema>) {
  const ctx = await requireActiveCouple(user.id);
  const partner = ctx.partner!;

  const letter = await prisma.openWhenLetter.create({
    data: {
      coupleId: ctx.couple.id,
      senderId: user.id,
      recipientId: partner.id,
      triggerLabel: input.triggerLabel,
      title: input.title,
      body: input.body,
      background: input.background,
    },
  });

  await notify({
    userId: partner.id,
    type: 'OPEN_WHEN',
    dedupeKey: `letter:${letter.id}`,
    relatedResourceType: 'letter',
    relatedResourceId: letter.id,
    payload: {
      title: `A letter is waiting for you 💌`,
      body: `Open when ${letter.triggerLabel.toLowerCase()}`,
      url: `/letters`,
      emoji: '✉️',
      background: letter.background,
    },
  });

  return letter;
}

/** Opening is recorded once, and only the recipient may do it. */
export async function openLetter(user: User, letterId: string) {
  const letter = await prisma.openWhenLetter.findUnique({ where: { id: letterId } });
  if (!letter || letter.deletedAt) throw NotFound('That letter is gone.');
  if (letter.recipientId !== user.id) {
    throw Forbidden('Only the person it was written for can open this.');
  }

  const opened =
    letter.status === 'SEALED'
      ? await prisma.openWhenLetter.update({
          where: { id: letterId },
          data: { status: 'OPENED', openedAt: new Date() },
        })
      : letter;

  if (letter.status === 'SEALED') {
    await notify({
      userId: letter.senderId,
      type: 'COUPLE_UPDATE',
      dedupeKey: `letter-opened:${letter.id}`,
      relatedResourceType: 'letter',
      relatedResourceId: letter.id,
      payload: {
        title: `${user.displayName} opened your letter`,
        body: letter.title,
        url: '/letters',
        emoji: '💗',
        background: letter.background,
      },
    });
  }

  return opened;
}
