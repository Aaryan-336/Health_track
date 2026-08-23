import { prisma } from '@/lib/db/client';
import { jsonBody, ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { ensureSharingDefaults } from '@/lib/permissions/sharing';
import { privacyUpdateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  await ensureSharingDefaults(user.id);

  const preferences = await prisma.sharingPreference.findMany({
    where: { userId: user.id },
    orderBy: { category: 'asc' },
  });
  return ok({ preferences });
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = privacyUpdateSchema.parse(await jsonBody(req));

  await prisma.$transaction(async (tx) => {
    for (const u of input.updates) {
      await tx.sharingPreference.upsert({
        where: { userId_category: { userId: user.id, category: u.category } },
        create: {
          userId: user.id,
          category: u.category,
          shareEnabled: u.shareEnabled,
          detailLevel: u.shareEnabled ? u.detailLevel : 'NONE',
        },
        update: {
          shareEnabled: u.shareEnabled,
          detailLevel: u.shareEnabled ? u.detailLevel : 'NONE',
        },
      });
    }

    // Consent changes are auditable — the user can see what they changed and when.
    await tx.auditEvent.create({
      data: {
        actorId: user.id,
        eventType: 'privacy.updated',
        resourceType: 'sharing_preference',
        metadataJson: { categories: input.updates.map((u) => u.category) },
      },
    });
  });

  const preferences = await prisma.sharingPreference.findMany({
    where: { userId: user.id },
    orderBy: { category: 'asc' },
  });
  return ok({ preferences });
});
