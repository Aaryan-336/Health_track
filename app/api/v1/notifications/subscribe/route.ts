import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { removeSubscription, saveSubscription } from '@/features/notifications/service';
import { subscribeSchema, unsubscribeSchema } from '@/lib/validation/schemas';

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = subscribeSchema.parse(await jsonBody(req));
  const sub = await saveSubscription(user.id, input);
  return ok({ id: sub.id }, 201);
});

export const DELETE = route(async (req) => {
  const user = await requireUser();
  const { endpoint } = unsubscribeSchema.parse(await jsonBody(req));
  await removeSubscription(user.id, endpoint);
  return ok({ removed: true });
});
