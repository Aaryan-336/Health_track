import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { createChallenge, listChallenges } from '@/features/couple/challenges';
import { challengeCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ challenges: await listChallenges(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = challengeCreateSchema.parse(await jsonBody(req));
  return ok(await createChallenge(user, input), 201);
});
