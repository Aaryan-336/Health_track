import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { toggleHabitCompletion } from '@/features/tracking/service';
import { habitCompleteSchema } from '@/lib/validation/schemas';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = habitCompleteSchema.parse(await jsonBody(req));
  return ok(await toggleHabitCompletion(user, id, { localDate: input.localDate, undo: input.undo }));
});
