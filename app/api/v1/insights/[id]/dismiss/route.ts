import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { dismissInsight } from '@/features/insights/service';

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await dismissInsight(user.id, id);
  return ok({ dismissed: true });
});
