import type { RequestHandler } from 'express';

// Express 4 does not catch rejected promises returned from an async route
// handler — an uncaught throw becomes an unhandled rejection and the response
// never gets sent. This forwards it to the error-handling middleware instead.
export const asyncHandler =
	(handler: RequestHandler): RequestHandler =>
	(req, res, next) => {
		Promise.resolve(handler(req, res, next)).catch(next);
	};
