import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { updateHabit } from '@/features/tracking/service';
import { habitUpdateSchema } from '@/lib/validation/schemas';

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = habitUpdateSchema.parse(await jsonBody(req));
  return ok(await updateHabit(user, id, input));
});
