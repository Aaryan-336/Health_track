import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { openLetter } from '@/features/messaging/service';

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return ok(await openLetter(user, id));
});
