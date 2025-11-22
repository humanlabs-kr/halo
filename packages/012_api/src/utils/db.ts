import * as schema from '@hl/database';
import { drizzle } from '@hl/database';
import { env } from 'cloudflare:workers';

export function useDB() {
	return drizzle(env.HYPERDRIVE.connectionString, { schema });
}
