import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { asyncHandler } from '../async-handler.js';
import { logger } from '../logger.js';
import { createRateLimit } from '../rate-limit.js';
import { signSession } from './jwt.js';

const digest = (value: string) => createHash('sha256').update(value).digest();

const timingSafeStringEqual = (a: string, b: string): boolean => timingSafeEqual(digest(a), digest(b));

// Login is the actual brute-force target on static env-var credentials, and it's
// pre-auth (no sessionId/sub exists yet), so it gets its own IP-keyed limiter.
const loginRateLimit = createRateLimit({ windowMs: 60_000, max: 10, keyOf: (req) => req.ip ?? 'unknown' });

export const authRouter = Router().post(
	'/auth/login',
	loginRateLimit,
	asyncHandler(async (req, res) => {
		const { username, password } = req.body ?? {};

		if (typeof username !== 'string' || typeof password !== 'string') {
			res.status(400).json({ error: '"username" and "password" are required' });
			return;
		}

		const expectedUsername = process.env['ADMIN_USERNAME'] ?? '';
		const expectedPassword = process.env['ADMIN_PASSWORD'] ?? '';

		const usernameMatches = timingSafeStringEqual(username, expectedUsername);
		const passwordMatches = timingSafeStringEqual(password, expectedPassword);

		if (!usernameMatches || !passwordMatches) {
			logger.info('login failed', { username });
			res.status(401).json({ error: 'Invalid credentials' });
			return;
		}

		const token = await signSession({ sub: username, sessionId: randomUUID() });
		logger.info('login succeeded', { username });
		res.json({ token });
	}),
);
