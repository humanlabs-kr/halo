import { Context, Next } from 'hono';
import { verifyAccessToken } from './jwt';

function parseCookie(cookie: string | undefined) {
	if (!cookie) return new Map();
	return cookie.split(';').reduce((map, curr) => {
		const [key, value] = curr.trim().split('=');
		map.set(key, value);
		return map;
	}, new Map<string, string>());
}

export const jwtAuthMiddleware = async (c: Context, next: Next) => {
	// 1. get from cookie
	// 2. if not found, get from header (authorization: Bearer <token>)
	// 3. if not found, return 401

	let token: string | undefined = undefined;
	const cookie = c.req.header('Cookie');
	const cookies = parseCookie(cookie);
	let tokenFromCookie = cookies.get('_access');

	if (!tokenFromCookie) {
		const bearer = c.req.header('Authorization');
		token = bearer?.replace('Bearer ', '').trim();
		if (!token) {
			return c.json({ code: 'UNAUTHORIZED', error: 'Unauthorized - Authentication required' }, 401);
		}
	} else {
		token = tokenFromCookie;
	}

	try {
		const payload = verifyAccessToken(token!);
		c.set('address', payload.sub);
		await next();
	} catch (error) {
		return c.json({ code: 'UNAUTHORIZED', error: 'Invalid token' }, 401);
	}
};
