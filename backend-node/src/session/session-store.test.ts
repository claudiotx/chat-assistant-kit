import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionStore } from './session-store.js';

interface Widget {
	count: number;
	label: string;
}

const makeDefault = (): Widget => ({ count: 0, label: 'default' });

describe('createSessionStore', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('gives a new sessionId a fresh default value', () => {
		const store = createSessionStore(makeDefault);

		expect(store.get('session-a')).toEqual({ count: 0, label: 'default' });
	});

	it('isolates state between different sessionIds — the actual multi-user bug this store fixes', () => {
		const store = createSessionStore(makeDefault);

		store.update('session-a', { label: 'alice' });
		store.update('session-b', { label: 'bob' });

		expect(store.get('session-a')).toEqual({ count: 0, label: 'alice' });
		expect(store.get('session-b')).toEqual({ count: 0, label: 'bob' });
	});

	it('update merges a partial patch without clobbering untouched fields', () => {
		const store = createSessionStore(makeDefault);

		store.update('session-a', { count: 5 });
		store.update('session-a', { label: 'updated' });

		expect(store.get('session-a')).toEqual({ count: 5, label: 'updated' });
	});

	it('update on a never-seen sessionId initializes from the default before applying the patch', () => {
		const store = createSessionStore(makeDefault);

		const result = store.update('brand-new-session', { count: 3 });

		expect(result).toEqual({ count: 3, label: 'default' });
	});

	it('does not leak state from one store instance into another', () => {
		const storeA = createSessionStore(makeDefault);
		const storeB = createSessionStore(makeDefault);

		storeA.update('same-session-id', { label: 'store-a-value' });

		expect(storeB.get('same-session-id')).toEqual({ count: 0, label: 'default' });
	});

	describe('idle sweep', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		it('evicts a session that has been idle past the TTL', () => {
			const store = createSessionStore(makeDefault);

			store.update('stale-session', { label: 'will expire' });

			// Idle past MAX_IDLE_MS (3h) without ever calling get/update again.
			vi.advanceTimersByTime(3 * 60 * 60 * 1000 + 1);

			// A fresh sweep tick has to run for eviction to happen.
			vi.advanceTimersByTime(10 * 60 * 1000);

			expect(store.get('stale-session')).toEqual({ count: 0, label: 'default' });
		});

		it('does not evict a session that was accessed within the TTL window', () => {
			const store = createSessionStore(makeDefault);

			store.update('active-session', { label: 'still alive' });

			// Keep touching the session every 10 minutes for a while — it should
			// never go idle long enough to be swept.
			for (let i = 0; i < 12; i++) {
				vi.advanceTimersByTime(10 * 60 * 1000);
				store.get('active-session');
			}

			expect(store.get('active-session')).toEqual({ count: 0, label: 'still alive' });
		});
	});
});
