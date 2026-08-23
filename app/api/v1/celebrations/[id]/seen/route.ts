import { prisma } from '@/lib/db/client';
import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;

  await prisma.celebrationSeen.upsert({
    where: { celebrationId_userId: { celebrationId: id, userId: user.id } },
    create: { celebrationId: id, userId: user.id },
    update: {},
  });

  return ok({ seen: true });
});
