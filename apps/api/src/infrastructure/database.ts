import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export type { PrismaClient };

/**
 * Create the single PrismaClient for the process (Prisma 7 + node-postgres
 * driver adapter). Construct it once in `main.ts` and pass it to the
 * repositories that need it — never instantiate PrismaClient inside a module.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

/** Readiness probe: a trivial round-trip to PostgreSQL. */
export async function pingDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
