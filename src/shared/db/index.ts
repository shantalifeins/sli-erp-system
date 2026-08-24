import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

const isSslDisabled = process.env.DATABASE_URL?.includes('sslmode=disable') ||
  process.env.DATABASE_URL?.includes('127.0.0.1') ||
  process.env.DATABASE_URL?.includes('172.17.0.1') ||
  process.env.DATABASE_URL?.includes('localhost');

export const createPool = () => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isSslDisabled ? false : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
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
