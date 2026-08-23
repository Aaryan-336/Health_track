import { prisma } from '@/lib/db/client';
import { ok, route } from '@/lib/api/respond';
import { getCoupleContext, requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';
import {
  computeActivityStreak,
  computeCheckInStreak,
  computeCoupleStreak,
} from '@/lib/scores/streaks';

export const GET = route(async () => {
  const user = await requireUser();
  const today = todayLocalDate(user.timezone);
  const ctx = await getCoupleContext(user.id);

  const [activity, checkIn, couple] = await Promise.all([
    computeActivityStreak(prisma, user.id, today),
    computeCheckInStreak(prisma, user.id, today),
    ctx && ctx.couple.status === 'ACTIVE'
      ? computeCoupleStreak(prisma, ctx.couple.id, ctx.couple.userAId, ctx.couple.userBId, today)
      : Promise.resolve(null),
  ]);

  return ok({ activity, checkIn, couple });
});
