import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { createCoupleSpace } from '@/features/couple/service';
import { coupleCreateSchema } from '@/lib/validation/schemas';

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = coupleCreateSchema.parse(await jsonBody(req));
  return ok(await createCoupleSpace(user, input), 201);
});
