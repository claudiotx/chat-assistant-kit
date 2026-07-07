import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from './jwt.js';

describe('signSession / verifySession', () => {
	it('round-trips sub and sessionId through a signed token', async () => {
		const token = await signSession({ sub: 'admin', sessionId: 'abc-123' });
		const result = await verifySession(token);

		expect(result).toEqual({ sub: 'admin', sessionId: 'abc-123' });
	});

	it('rejects a malformed/garbage token', async () => {
		await expect(verifySession('not-a-real-jwt')).rejects.toThrow();
	});

	it('rejects a token signed with a different secret', async () => {
		const wrongSecret = new TextEncoder().encode('a-completely-different-secret-value');

		const forgedToken = await new SignJWT({ sub: 'admin', sessionId: 'forged' })
			.setProtectedHeader({ alg: 'HS256' })
			.setExpirationTime('2h')
			.sign(wrongSecret);

		await expect(verifySession(forgedToken)).rejects.toThrow();
	});

	it('rejects a token missing the expected claims', async () => {
		const secret = new TextEncoder().encode(process.env['JWT_SECRET']!);

		const incompleteToken = await new SignJWT({ sub: 'admin' }) // no sessionId
			.setProtectedHeader({ alg: 'HS256' })
			.setExpirationTime('2h')
			.sign(secret);

		await expect(verifySession(incompleteToken)).rejects.toThrow('Malformed token payload');
	});

	it('rejects an expired token', async () => {
		const secret = new TextEncoder().encode(process.env['JWT_SECRET']!);

		const expiredToken = await new SignJWT({ sub: 'admin', sessionId: 'abc-123' })
			.setProtectedHeader({ alg: 'HS256' })
			.setExpirationTime(Math.floor(Date.now() / 1000) - 60) // 60s in the past
			.sign(secret);

		await expect(verifySession(expiredToken)).rejects.toThrow();
	});
});
