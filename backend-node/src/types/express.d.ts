export interface AuthContext {
	sub: string;
	sessionId: string;
}

declare global {
	namespace Express {
		interface Request {
			auth?: AuthContext;
		}
	}
}
