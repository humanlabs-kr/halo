import { fromHono } from 'chanfana';
import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compact } from 'lodash-es';
import v1Routes from './routes';
import type { ContextType } from './types';
import { useDB } from './utils/db';
import scalar from './utils/scalar';

const app = new Hono<ContextType>();

/**
 * Scalar API Docs UI
 */
app.get('/docs', async (c) => {
	return c.html(scalar());
});

/**
 * Set db to context
 */
app.use(async (c, next) => {
	c.set('db', useDB());
	await next();
});

app.use(
	'/*',
	cors({
		origin: (origin, c) => {
			const predefinedOrigins = compact(env.PREDEFINED_CORS_ORIGINS.split(','));
			const originBaseDomains = compact(env.CORS_ORIGIN_BASE_DOMAINS.split(','));
			if (predefinedOrigins.includes(origin)) {
				return origin;
			}

			if (originBaseDomains.some((domain) => origin.endsWith(domain))) {
				return origin;
			}

			return null;
		},
		credentials: true,
		allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
		exposeHeaders: ['Set-Cookie'],
	})
);


const openapi = fromHono(app, {
	openapi_url: '/api/openapi.json',
	schema: {
		security: [{ cookieAuth: [] }, { bearerAuth: [] }],
	},
});

openapi.route('/v1', v1Routes);

export default {
	async fetch(request, env, ctx) {
		return openapi.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
