import 'dotenv/config';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { aiRouter } from './ai/chat/router.js';
import { authRouter } from './auth/router.js';
import { initAIDevTools } from './ai/devtools/index.js';
import { formRouter } from './form/router.js';
import { logger } from './logger.js';
import { initAITelemetry } from './telemetry/index.js';

void initAITelemetry();
void initAIDevTools();

const app = express();

const allowedOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:5173').split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use((req, res, next) => {
	const start = Date.now();
	res.on('finish', () => {
		logger.info(`${req.method} ${req.originalUrl} -> ${res.statusCode}`, { ms: Date.now() - start });
	});
	next();
});

app.use('/api', authRouter);
app.use('/api', aiRouter);
app.use('/api', formRouter);

// Centralized error handler: logs full detail server-side, returns a generic
// error to the client. Without this, an uncaught throw would fall through to
// Express's default handler, which renders a stack-trace HTML page whenever
// NODE_ENV !== 'production' (the default state of a freshly cloned boilerplate).
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
	logger.error('unhandled request error', { error: String(error) });

	if (!res.headersSent) {
		res.status(500).json({ error: 'Internal server error' });
	}
};

app.use(errorHandler);

const port = Number(process.env['PORT'] ?? 8000);

app.listen(port, () => {
	console.log(`AI Assistant backend (Node/Express) listening on http://localhost:${port}`);
});
