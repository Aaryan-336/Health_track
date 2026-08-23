import { prisma } from '@/lib/db/client';
import { rollDailyReminders, runTick } from '@/features/notifications/dispatcher';

/**
 * Standalone notification worker.
 *
 * Delivers scheduled messages and due push notifications on a fixed interval.
 * The same work is reachable over HTTP at `POST /api/v1/cron/tick` for hosts
 * where a long-running process is not available — both paths are idempotent, so
 * running the worker and a cron ping at the same time is safe.
 *
 *   npm run worker
 *
 * Environment:
 *   TICK_INTERVAL_SECONDS  how often to run       (default 60)
 *   RECALCULATE_SCORES     rebuild derived scores (default off, "1" to enable)
 */

const INTERVAL_MS = Math.max(15, Number(process.env.TICK_INTERVAL_SECONDS ?? 60)) * 1000;
const RECALCULATE = process.env.RECALCULATE_SCORES === '1';

let running = false;
let stopping = false;

async function tick() {
  // Never overlap with the previous pass — a slow tick must not stack up.
  if (running || stopping) return;
  running = true;

  const startedAt = Date.now();
  try {
    const result = await runTick({ recalculate: RECALCULATE });
    const remindersRolled = await rollDailyReminders();

    const did =
      result.messagesDelivered +
      result.notificationsSent +
      result.notificationsDeferred +
      remindersRolled;

    // Quiet unless something actually happened, so the logs stay readable.
    if (did > 0) {
      console.log(
        `[worker] ${new Date().toISOString()} ` +
          `messages=${result.messagesDelivered} ` +
          `sent=${result.notificationsSent} ` +
          `deferred=${result.notificationsDeferred} ` +
          `rolled=${remindersRolled} ` +
          `(${Date.now() - startedAt}ms)`,
      );
    }
  } catch (error) {
    // A failed pass must never kill the worker — the next one tries again.
    console.error('[worker] tick failed:', error);
  } finally {
    running = false;
  }
}

const timer = setInterval(() => void tick(), INTERVAL_MS);
void tick();

console.log(`[worker] started · every ${INTERVAL_MS / 1000}s · recalculate=${RECALCULATE}`);

/** Finish the pass in flight, then let the process exit cleanly. */
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[worker] ${signal} — shutting down`);
  clearInterval(timer);

  const deadline = Date.now() + 10_000;
  while (running && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
