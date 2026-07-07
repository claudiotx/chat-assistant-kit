// In-memory, per-process store keyed by sessionId. Fine for a single-instance
// boilerplate; swap the Map for Redis (or similar) to run multiple instances or
// survive restarts. A fresh sessionId is minted on every login, so entries are
// swept on a timer below rather than left to grow forever.

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const MAX_IDLE_MS = 3 * 60 * 60 * 1000; // JWT TTL (2h) + grace
const MAX_ENTRIES = 10_000; // hard backstop against unbounded growth

interface Entry<T> {
	value: T;
	lastAccessedAt: number;
}

export interface SessionStore<T> {
	get(sessionId: string): T;
	update(sessionId: string, patch: Partial<T>): T;
}

export function createSessionStore<T extends object>(defaultFactory: () => T): SessionStore<T> {
	const entries = new Map<string, Entry<T>>();

	const touch = (sessionId: string): Entry<T> => {
		let entry = entries.get(sessionId);

		if (!entry) {
			if (entries.size >= MAX_ENTRIES) {
				// Evict the oldest entry to make room rather than grow unbounded.
				const oldestKey = entries.keys().next().value;
				if (oldestKey !== undefined) entries.delete(oldestKey);
			}

			entry = { value: defaultFactory(), lastAccessedAt: Date.now() };
			entries.set(sessionId, entry);
		} else {
			entry.lastAccessedAt = Date.now();
		}

		return entry;
	};

	setInterval(() => {
		const now = Date.now();

		for (const [sessionId, entry] of entries) {
			if (now - entry.lastAccessedAt > MAX_IDLE_MS) {
				entries.delete(sessionId);
			}
		}
	}, SWEEP_INTERVAL_MS).unref();

	return {
		get(sessionId) {
			return touch(sessionId).value;
		},
		update(sessionId, patch) {
			const entry = touch(sessionId);
			entry.value = { ...entry.value, ...patch };
			return entry.value;
		},
	};
}
