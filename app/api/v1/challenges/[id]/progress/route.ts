import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { addChallengeProgress } from '@/features/couple/challenges';
import { challengeProgressSchema } from '@/lib/validation/schemas';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { increment } = challengeProgressSchema.parse(await jsonBody(req));
  return ok(await addChallengeProgress(user, id, increment));
});
