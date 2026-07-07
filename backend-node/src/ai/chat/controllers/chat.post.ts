import { safeValidateUIMessages } from 'ai';
import type { RequestHandler } from 'express';
import { HttpError } from '../../../http-error.js';
import { logger } from '../../../logger.js';
import { buildToolsForSession } from '../../tools/index.js';
import { createUiStream } from '../lib/create-ui-stream.js';
import { ChatRequest } from '../models/chat-request.js';
import { fixErrorToolCalls } from '../utils/fix-error-tool-calls.js';

export const aiChatPostHandler: RequestHandler = async (req, res) => {
	try {
		const parseResult = ChatRequest.safeParse(req.body);

		if (!parseResult.success) {
			res.status(400).json({ error: parseResult.error.message });
			return;
		}

		const { model, messages: rawMessages, context } = parseResult.data;
		const { sessionId, sub } = req.auth!;

		logger.info('chat request received', { sub, model, messageCount: rawMessages.length });

		const fixedMessages = fixErrorToolCalls(rawMessages);
		const validationResult = await safeValidateUIMessages({ messages: fixedMessages });

		if (!validationResult.success) {
			res.status(400).json({ error: validationResult.error.message });
			return;
		}

		const tools = buildToolsForSession(sessionId);
		const stream = await createUiStream(validationResult.data, { model, tools, context });

		stream.pipeUIMessageStreamToResponse(res);
	} catch (error) {
		if (error instanceof HttpError) {
			res.status(error.statusCode).json({ error: error.message });
			return;
		}

		logger.error('chat request failed', { error: String(error) });
		res.status(500).json({ error: 'Internal server error' });
	}
};
