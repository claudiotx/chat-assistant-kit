import type { RequestHandler } from 'express';
import { logger } from '../logger.js';
import { verifySession } from './jwt.js';

export const requireAuth: RequestHandler = async (req, res, next) => {
	const header = req.headers.authorization;

	if (!header?.startsWith('Bearer ')) {
		res.status(401).json({ error: 'Missing bearer token' });
		return;
	}

	const token = header.slice('Bearer '.length);

	try {
		req.auth = await verifySession(token);
		next();
	} catch (error) {
		logger.info('rejected invalid/expired token', { error: String(error) });
		res.status(401).json({ error: 'Invalid or expired token' });
	}
};
