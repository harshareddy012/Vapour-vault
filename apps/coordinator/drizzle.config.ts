import type { Config } from 'drizzle-kit';
import { config } from '@dfs-sss/config';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: config.DATABASE_URL,
  },
} satisfies Config;
