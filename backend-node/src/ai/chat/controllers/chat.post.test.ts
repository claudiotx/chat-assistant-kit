import { safeValidateUIMessages } from 'ai';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../../http-error.js';
import { buildToolsForSession } from '../../tools/index.js';
import { createUiStream } from '../lib/create-ui-stream.js';
import { aiChatPostHandler } from './chat.post.js';

vi.mock('ai', () => ({
	safeValidateUIMessages: vi.fn(),
}));

vi.mock('../lib/create-ui-stream.js', () => ({
	createUiStream: vi.fn(),
}));

vi.mock('../../tools/index.js', () => ({
	buildToolsForSession: vi.fn(),
}));

function makeRes() {
	const res: Partial<Response> = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	};
	return res as Response;
}

describe('aiChatPostHandler', () => {
	let mockRes: Response;
	let mockStream: { pipeUIMessageStreamToResponse: ReturnType<typeof vi.fn> };
	const validMessages = [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }];

	beforeEach(() => {
		mockRes = makeRes();

		mockStream = { pipeUIMessageStreamToResponse: vi.fn() };
		vi.mocked(createUiStream).mockResolvedValue(mockStream as any);
		vi.mocked(buildToolsForSession).mockReturnValue({} as any);
		vi.mocked(safeValidateUIMessages).mockResolvedValue({ success: true, data: validMessages } as any);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function makeReq(body: unknown): Request {
		return { body, auth: { sub: 'admin', sessionId: 'session-abc' } } as unknown as Request;
	}

	it('returns 400 when the body fails schema validation', async () => {
		await aiChatPostHandler(makeReq({ messages: 'not-an-array' }), mockRes, vi.fn());

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(vi.mocked(safeValidateUIMessages)).not.toHaveBeenCalled();
	});

	it('returns 400 for an empty messages array without calling safeValidateUIMessages', async () => {
		await aiChatPostHandler(makeReq({ messages: [] }), mockRes, vi.fn());

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(vi.mocked(safeValidateUIMessages)).not.toHaveBeenCalled();
	});

	it('returns 400 when safeValidateUIMessages rejects the messages', async () => {
		vi.mocked(safeValidateUIMessages).mockResolvedValue({
			success: false,
			error: new Error('bad shape'),
		} as any);

		await aiChatPostHandler(makeReq({ messages: validMessages }), mockRes, vi.fn());

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(vi.mocked(createUiStream)).not.toHaveBeenCalled();
	});

	it('builds session-scoped tools and streams the response on a valid request', async () => {
		await aiChatPostHandler(makeReq({ messages: validMessages, model: 'gpt-4o' }), mockRes, vi.fn());

		expect(vi.mocked(buildToolsForSession)).toHaveBeenCalledWith('session-abc');
		expect(vi.mocked(createUiStream)).toHaveBeenCalledWith(
			validMessages,
			expect.objectContaining({ model: 'gpt-4o' }),
		);
		expect(mockStream.pipeUIMessageStreamToResponse).toHaveBeenCalledWith(mockRes);
	});

	it('defaults the model to gpt-4o-mini when not provided', async () => {
		await aiChatPostHandler(makeReq({ messages: validMessages }), mockRes, vi.fn());

		expect(vi.mocked(createUiStream)).toHaveBeenCalledWith(
			validMessages,
			expect.objectContaining({ model: 'gpt-4o-mini' }),
		);
	});

	it('maps a thrown HttpError to its own status code and message, not a generic 500', async () => {
		vi.mocked(createUiStream).mockRejectedValue(new HttpError(400, 'Model "gpt-3" is not in the allowed list'));

		await aiChatPostHandler(makeReq({ messages: validMessages, model: 'gpt-3' }), mockRes, vi.fn());

		expect(mockRes.status).toHaveBeenCalledWith(400);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Model "gpt-3" is not in the allowed list' });
	});

	it('maps an unexpected error to a generic 500 without leaking its message', async () => {
		vi.mocked(createUiStream).mockRejectedValue(new Error('some internal implementation detail'));

		await aiChatPostHandler(makeReq({ messages: validMessages }), mockRes, vi.fn());

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
	});
});
