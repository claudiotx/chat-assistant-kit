import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRateLimit } from './rate-limit.js';

function makeRes() {
	const res: Partial<Response> = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	};
	return res as Response;
}

describe('createRateLimit', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('allows requests up to the configured max', () => {
		const limiter = createRateLimit({ windowMs: 60_000, max: 3, keyOf: () => 'same-key' });
		const next = vi.fn();

		for (let i = 0; i < 3; i++) {
			limiter({} as Request, makeRes(), next);
		}

		expect(next).toHaveBeenCalledTimes(3);
	});

	it('blocks the request past the max with a 429', () => {
		const limiter = createRateLimit({ windowMs: 60_000, max: 3, keyOf: () => 'same-key' });
		const next = vi.fn();

		for (let i = 0; i < 3; i++) {
			limiter({} as Request, makeRes(), next);
		}

		const blockedRes = makeRes();
		limiter({} as Request, blockedRes, next);

		expect(next).toHaveBeenCalledTimes(3); // not called a 4th time
		expect(blockedRes.status).toHaveBeenCalledWith(429);
		expect(blockedRes.json).toHaveBeenCalledWith({ error: 'Too many requests, please try again later' });
	});

	it('keeps independent quotas per key — one caller cannot exhaust another', () => {
		const limiter = createRateLimit({ windowMs: 60_000, max: 1, keyOf: (req) => (req as any).testKey });
		const next = vi.fn();

		limiter({ testKey: 'alice' } as any, makeRes(), next);
		const bobRes = makeRes();
		limiter({ testKey: 'bob' } as any, bobRes, next);

		expect(next).toHaveBeenCalledTimes(2);
		expect(bobRes.status).not.toHaveBeenCalled();
	});

	it('resets the quota once the window has passed', () => {
		vi.useFakeTimers();

		const limiter = createRateLimit({ windowMs: 60_000, max: 1, keyOf: () => 'same-key' });
		const next = vi.fn();

		limiter({} as Request, makeRes(), next);

		const blockedRes = makeRes();
		limiter({} as Request, blockedRes, next);
		expect(blockedRes.status).toHaveBeenCalledWith(429);

		vi.advanceTimersByTime(60_001);

		const afterWindowRes = makeRes();
		limiter({} as Request, afterWindowRes, next);

		expect(next).toHaveBeenCalledTimes(2); // first request + this one, not the blocked one
		expect(afterWindowRes.status).not.toHaveBeenCalled();
	});
});
