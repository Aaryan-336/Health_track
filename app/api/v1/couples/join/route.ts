import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { joinWithCode } from '@/features/couple/service';
import { coupleJoinSchema } from '@/lib/validation/schemas';

export const POST = route(async (req) => {
  const user = await requireUser();
  const { code } = coupleJoinSchema.parse(await jsonBody(req));
  return ok(await joinWithCode(user, code));
});
