import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { reactToMessage, removeReaction } from '@/features/messaging/service';
import { reactionSchema } from '@/lib/validation/schemas';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = reactionSchema.parse(await jsonBody(req));
  return ok(await reactToMessage(user, id, input));
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await removeReaction(user.id, id);
  return ok({ removed: true });
});
