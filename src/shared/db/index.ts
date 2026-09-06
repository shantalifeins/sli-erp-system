import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

const DEFAULT_DATABASE_URL = "postgresql://postgres.lyoozoeryooisqywbfyg:_m%40qU2757EsbdVD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

export const getConnectionString = () => {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
};

export const createPool = () => {
  const dbUrl = getConnectionString();
  const isSslDisabled = dbUrl.includes('sslmode=disable') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('172.17.0.1') ||
    dbUrl.includes('localhost');

  return new Pool({
    connectionString: dbUrl,
    ssl: isSslDisabled ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });
};

const globalForDb = globalThis as unknown as {
  pool: pg.Pool | undefined;
};

const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Close pool on exit to prevent EMAXCONNSESSION in development
const closePool = async () => {
  if (pool) {
    try {
      await pool.end();
      console.log('Postgres pool closed.');
    } catch (err) {
      console.error('Error closing Postgres pool:', err);
    }
  }
  process.exit(0);
};

process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);
process.on('SIGUSR2', closePool); // for nodemon/tsx restarts

export const db = drizzle(pool, { schema });
