import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { getCoupleContext, requireUser } from '@/lib/permissions';
import { updateCouple } from '@/features/couple/service';
import { coupleUpdateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  if (!ctx) return ok({ couple: null, partner: null });

  const pendingInvite =
    ctx.couple.status === 'PENDING'
      ? await prisma.coupleInvite.findFirst({
          where: { coupleId: ctx.couple.id, status: 'PENDING', expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          select: { code: true, expiresAt: true },
        })
      : null;

  return ok({
    couple: ctx.couple,
    side: ctx.side,
    // Only ever the partner's public identity — never their health data.
    partner: ctx.partner
      ? { id: ctx.partner.id, displayName: ctx.partner.displayName, avatarUrl: ctx.partner.avatarUrl }
      : null,
    pendingInvite,
  });
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const input = coupleUpdateSchema.parse(await jsonBody(req));
  return ok(await updateCouple(user, input));
});
