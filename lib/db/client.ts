import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Normalises the connection string before Prisma sees it.
 *
 * Connection poolers in transaction mode (Supabase's port 6543, PgBouncer in
 * general) hand each query a different backend, so a prepared statement made on
 * one connection is missing — or worse, already taken — on the next. Postgres
 * reports that as `42P05 prepared statement "sN" already exists`. Prisma only
 * stops using prepared statements when the URL says `pgbouncer=true`, which is
 * easy to leave off, so we add it here rather than trusting every environment
 * to be configured perfectly.
 *
 * A direct connection is left exactly as provided. The hostname test also
 * catches Neon's `-pooler` endpoints, which need the same flag. It errs
 * towards applying it: doing so on a session-mode pooler costs only prepared
 * statements, while missing it on a transaction-mode one breaks every request.
 */

/**
 * The home dashboard fans out more than a dozen queries at once. Prisma's pool
 * has to be wide enough to actually run them in parallel — with a pool of one
 * they queue, and on a database in another region the tail of that queue hits
 * `P2024 Timed out fetching a new connection`. The pooler upstream is what
 * protects Postgres from too many connections, not this number.
 */
const MIN_POOL_SIZE = 10;
const POOL_TIMEOUT_SECONDS = 20;
export function poolAwareUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw; // Not parseable — hand it to Prisma untouched and let it complain.
  }

  const pooled = url.port === '6543' || /pooler\.|pgbouncer/i.test(url.hostname);
  if (!pooled) return raw;

  if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true');

  const configured = Number(url.searchParams.get('connection_limit'));
  if (!Number.isFinite(configured) || configured < MIN_POOL_SIZE) {
    if (Number.isFinite(configured) && configured > 0) {
      console.warn(
        `[db] connection_limit=${configured} is too small for this app's parallel ` +
          `queries — using ${MIN_POOL_SIZE} instead.`,
      );
    }
    url.searchParams.set('connection_limit', String(MIN_POOL_SIZE));
  }

  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', String(POOL_TIMEOUT_SECONDS));
  }

  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: poolAwareUrl(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Transaction client type — used by services that must run atomically. */
export type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
