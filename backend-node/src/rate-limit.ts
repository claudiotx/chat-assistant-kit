import type { RequestHandler } from 'express';

// In-memory sliding-window limiter, per-process. Swap for Redis (or similar) to
// share limits across multiple instances.
export function createRateLimit(options: { windowMs: number; max: number; keyOf: (req: Parameters<RequestHandler>[0]) => string }): RequestHandler {
	const hits = new Map<string, number[]>();

	return (req, res, next) => {
		const key = options.keyOf(req);
		const now = Date.now();
		const timestamps = (hits.get(key) ?? []).filter((t) => now - t < options.windowMs);

		if (timestamps.length >= options.max) {
			res.status(429).json({ error: 'Too many requests, please try again later' });
			return;
		}

		timestamps.push(now);
		hits.set(key, timestamps);
		next();
	};
}
