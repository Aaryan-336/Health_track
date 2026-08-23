import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { actOnPromise } from '@/features/couple/promises';
import { promiseActionSchema } from '@/lib/validation/schemas';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { action } = promiseActionSchema.parse(await jsonBody(req));
  return ok(await actOnPromise(user, id, action));
});
