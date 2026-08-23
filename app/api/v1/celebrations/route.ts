import { prisma } from '@/lib/db/client';
import { ok, route } from '@/lib/api/respond';
import { getCoupleContext, requireUser } from '@/lib/permissions';

/** Unseen celebrations for this user, newest first. */
export const GET = route(async () => {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);

  const celebrations = await prisma.celebration.findMany({
    where: {
      seenBy: { none: { userId: user.id } },
      OR: [
        ...(ctx ? [{ coupleId: ctx.couple.id }] : []),
        { goal: { participants: { some: { userId: user.id } } } },
      ],
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600_000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return ok({ celebrations });
});
