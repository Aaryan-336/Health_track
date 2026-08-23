import { ok, route } from '@/lib/api/respond';
import { env } from '@/lib/env';
import { Unauthorized } from '@/lib/permissions/errors';
import { rollDailyReminders, runTick } from '@/features/notifications/dispatcher';

/**
 * Background tick — delivers due messages and pushes, and optionally refreshes
 * derived scores. Guarded by a shared secret, never by a user session.
 */
async function handle(req: Request) {
  const auth = req.headers.get('authorization');
  const secret = env().CRON_SECRET;
  if (auth !== `Bearer ${secret}`) throw Unauthorized('Invalid cron credentials.');

  const recalculate = new URL(req.url).searchParams.get('recalculate') === '1';
  const result = await runTick({ recalculate });
  const remindersRolled = await rollDailyReminders();

  return ok({ ...result, remindersRolled, ranAt: new Date().toISOString() });
}

export const POST = route(handle);
export const GET = route(handle);
