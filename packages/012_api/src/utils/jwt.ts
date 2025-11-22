import { env } from 'cloudflare:workers';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
	// address
	sub: string;
	iat?: number;
	exp?: number;
}

export type PreauthorizedDataPayload = {
	iat?: number;
	exp?: number;
};

export function generatePreauthorizedData(payload: Omit<PreauthorizedDataPayload, 'iat' | 'exp'>): string {
	return jwt.sign(payload, env.JWT_SECRET, {
		expiresIn: '1d', // 1일
	});
}

export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
	return jwt.sign(payload, env.JWT_SECRET, {
		expiresIn: '1y', // 1년
	});
}

export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
	return jwt.sign(payload, env.JWT_SECRET, {
		expiresIn: '1y', // 1년
	});
}

export function verifyAccessToken(token: string): JWTPayload {
	return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
}

export function verifyPreauthorizedData(token: string): PreauthorizedDataPayload {
	return jwt.verify(token, env.JWT_SECRET) as PreauthorizedDataPayload;
}
