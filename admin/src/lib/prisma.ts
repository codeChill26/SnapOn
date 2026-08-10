import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Retrieve connection URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && typeof window === 'undefined') {
  console.warn('DATABASE_URL environment variable is missing in process.env');
}

// SSL theo connection string (giống backend/config/db.js): Supabase cần SSL,
// Postgres local (sslmode=disable hoặc localhost) thì không hỗ trợ SSL.
const connectionString = databaseUrl || 'postgresql://localhost:5432/dummy';
const sslDisabled =
  connectionString.includes('sslmode=disable') ||
  /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString) ||
  String(process.env.PGSSLMODE || '').toLowerCase() === 'disable';

const pool = globalForPrisma.pool ?? new Pool({
  connectionString,
  // SSL theo connection string: Supabase cần SSL, Postgres local thì không.
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
  max: 5, // Limit max pool size per serverless container
  idleTimeoutMillis: 30000,
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
