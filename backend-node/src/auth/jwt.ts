import { jwtVerify, SignJWT } from 'jose';
import type { AuthContext } from '../types/express.js';

const secretEnv = process.env['JWT_SECRET'];

if (!secretEnv) {
	throw new Error('JWT_SECRET must be set (generate one with: openssl rand -hex 32)');
}

const secret = new TextEncoder().encode(secretEnv);

const TOKEN_TTL = '2h';

export const signSession = (auth: AuthContext): Promise<string> =>
	new SignJWT({ ...auth })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime(TOKEN_TTL)
		.sign(secret);

export const verifySession = async (token: string): Promise<AuthContext> => {
	const { payload } = await jwtVerify(token, secret);

	if (typeof payload['sub'] !== 'string' || typeof payload['sessionId'] !== 'string') {
		throw new Error('Malformed token payload');
	}

	return { sub: payload['sub'], sessionId: payload['sessionId'] };
};
