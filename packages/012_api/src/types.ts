import type { Context } from 'hono';
import type { useDB } from './utils/db';

export type AppContext = Context<ContextType>;

export interface Variables {
	address: `0x${string}`;
	db: ReturnType<typeof useDB>;
}

export interface ContextType {
	Bindings: Env;
	Variables: Variables;
}
