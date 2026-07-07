import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware.js';
import { logger } from '../logger.js';
import { getArticleForm, updateArticleForm } from '../state/article-form.js';

const articleFormPatchSchema = z
	.object({
		title: z.string().optional(),
		status: z.enum(['draft', 'in_review', 'published']).optional(),
		category: z.string().optional(),
		featured: z.boolean().optional(),
	})
	.strict();

export const formRouter = Router()
	.get('/form-state', requireAuth, (req, res) => {
		res.json(getArticleForm(req.auth!.sessionId));
	})
	.put('/form-state', requireAuth, (req, res) => {
		const parseResult = articleFormPatchSchema.safeParse(req.body ?? {});

		if (!parseResult.success) {
			res.status(400).json({ error: parseResult.error.message });
			return;
		}

		logger.info('form-state updated via UI', { sub: req.auth!.sub, patch: parseResult.data });
		res.json(updateArticleForm(req.auth!.sessionId, parseResult.data));
	});
