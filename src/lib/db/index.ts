import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logger } from '@/lib/logger';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.warn('DATABASE_URL is not set', 'db');
}

const client = postgres(connectionString || '');
export const db = drizzle(client, { schema });
