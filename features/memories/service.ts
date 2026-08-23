import type { User } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/client';
import { Forbidden, NotFound } from '@/lib/permissions/errors';
import { requireActiveCouple } from '@/lib/permissions';
import { assertUploadAllowed, storage } from '@/lib/storage';
import type { memoryCreateSchema } from '@/lib/validation/schemas';

/** Memories timeline — couple-scoped, with photos served through an authorised route. */

const memoryInclude = {
  creator: { select: { id: true, displayName: true, avatarUrl: true } },
  media: { orderBy: { sortOrder: 'asc' } },
} as const;

export async function listMemories(userId: string) {
  const ctx = await requireActiveCouple(userId);
  return prisma.memory.findMany({
    where: { coupleId: ctx.couple.id, deletedAt: null },
    include: memoryInclude,
    orderBy: { memoryDate: 'desc' },
  });
}

export async function createMemory(
  user: User,
  input: z.infer<typeof memoryCreateSchema>,
  files: File[],
) {
  const ctx = await requireActiveCouple(user.id);

  const uploads = [];
  for (const [index, file] of files.slice(0, 4).entries()) {
    assertUploadAllowed(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storage.put(buffer, file.type, `memories/${ctx.couple.id}`);
    uploads.push({ storageKey: stored.key, mediaType: 'image', sortOrder: index });
  }

  return prisma.memory.create({
    data: {
      coupleId: ctx.couple.id,
      creatorId: user.id,
      caption: input.caption ?? null,
      memoryDate: new Date(input.memoryDate),
      media: { create: uploads },
    },
    include: memoryInclude,
  });
}

export async function deleteMemory(user: User, memoryId: string) {
  const ctx = await requireActiveCouple(user.id);

  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    include: { media: true },
  });
  if (!memory || memory.deletedAt) throw NotFound('That memory is gone.');
  if (memory.coupleId !== ctx.couple.id) throw Forbidden('That memory is not yours.');
  if (memory.creatorId !== user.id) {
    throw Forbidden('Only the partner who added this memory can remove it.');
  }

  await prisma.memory.update({ where: { id: memoryId }, data: { deletedAt: new Date() } });
  for (const m of memory.media) await storage.remove(m.storageKey);
}

/** Authorises a media read: only active members of the owning couple. */
export async function resolveMediaForUser(userId: string, mediaId: string) {
  const media = await prisma.memoryMedia.findUnique({
    where: { id: mediaId },
    include: { memory: true },
  });
  if (!media || media.memory.deletedAt) throw NotFound('That image is gone.');

  const couple = await prisma.coupleRelationship.findUnique({
    where: { id: media.memory.coupleId },
  });
  const isMember =
    couple && couple.status !== 'ENDED' && (couple.userAId === userId || couple.userBId === userId);
  if (!isMember) throw Forbidden('That image is not yours to view.');

  const object = await storage.get(media.storageKey);
  if (!object) throw NotFound('That image is gone.');
  return object;
}
