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
  // One connection per invocation: the pooler is doing the pooling now.
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');

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
