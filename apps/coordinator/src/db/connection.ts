import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from '@dfs-sss/config';
import * as schema from './schema.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
