import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';
import { getWaterDay, logWater } from '@/features/tracking/service';
import { waterCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async (req) => {
  const user = await requireUser();
  const date = new URL(req.url).searchParams.get('date') ?? todayLocalDate(user.timezone);
  return ok(await getWaterDay(user.id, date));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = waterCreateSchema.parse(await jsonBody(req));
  const result = await logWater(user, input);
  const day = await getWaterDay(user.id, result.entry.localDate);
  return ok({ ...result, day }, 201);
});
