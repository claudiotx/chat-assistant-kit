import { Router } from 'express';
import { requireAuth } from '../../auth/middleware.js';
import { getAllowedModels } from '../providers/index.js';
import { createRateLimit } from '../../rate-limit.js';
import { aiChatPostHandler } from './controllers/chat.post.js';

// Keyed by `sub` (the stable username claim), not sessionId — a fresh sessionId
// is minted on every login, so keying by it would let anyone who can call
// /auth/login repeatedly reset their own quota for free.
const chatRateLimit = createRateLimit({ windowMs: 60_000, max: 20, keyOf: (req) => req.auth!.sub });

export const aiRouter = Router()
	.post('/chat', requireAuth, chatRateLimit, aiChatPostHandler)
	.get('/models', requireAuth, (_req, res) => {
		// Single-provider (OpenAI) for now; shaped as a list of {provider, model}
		// pairs so the frontend dropdown and this endpoint are both ready for more
		// providers without changing shape later.
		res.json({ models: getAllowedModels().map((model) => ({ provider: 'openai', model })) });
	});
