import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { createPromise, listPromises } from '@/features/couple/promises';
import { promiseCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ promises: await listPromises(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = promiseCreateSchema.parse(await jsonBody(req));
  return ok(await createPromise(user, input), 201);
});
