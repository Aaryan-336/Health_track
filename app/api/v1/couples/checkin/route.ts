import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireActiveCouple, requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';
import { submitCheckIn } from '@/features/couple/service';
import { checkInSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  const ctx = await requireActiveCouple(user.id);
  const localDate = todayLocalDate(user.timezone);

  const checkIns = await prisma.dailyCheckIn.findMany({
    where: { coupleId: ctx.couple.id, localDate },
  });

  return ok({
    localDate,
    mine: checkIns.find((c) => c.userId === user.id) ?? null,
    partnerCheckedIn: checkIns.some((c) => c.userId === ctx.partner!.id && c.status === 'DONE'),
  });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = checkInSchema.parse(await jsonBody(req));
  return ok(await submitCheckIn(user, input), 201);
});
