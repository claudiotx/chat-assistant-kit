import { describe, expect, it } from 'vitest';
import { ChatRequest } from './chat-request.js';

describe('ChatRequest schema', () => {
	it('accepts a minimal valid request and defaults the model', () => {
		const result = ChatRequest.safeParse({
			messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.model).toBe('gpt-4o-mini');
		}
	});

	it('rejects an empty messages array', () => {
		const result = ChatRequest.safeParse({ messages: [] });
		expect(result.success).toBe(false);
	});

	it('rejects a missing messages field', () => {
		const result = ChatRequest.safeParse({ model: 'gpt-4o-mini' });
		expect(result.success).toBe(false);
	});

	it(
		'accepts messages with arbitrary extra fields — regression guard for the zod v3/v4 ' +
			'`.passthrough()` vs `z.looseObject({})` difference (the latter does not exist in v3 ' +
			'and would throw at import time if reintroduced)',
		() => {
			const result = ChatRequest.safeParse({
				messages: [
					{
						id: '1',
						role: 'assistant',
						parts: [{ type: 'tool-update_settings_form', state: 'output-available', someFutureField: 'x' }],
					},
				],
			});

			expect(result.success).toBe(true);
		},
	);

	it('accepts an explicit model, overriding the default', () => {
		const result = ChatRequest.safeParse({
			model: 'gpt-4o',
			messages: [{ id: '1', role: 'user', parts: [] }],
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.model).toBe('gpt-4o');
		}
	});

	it('accepts a request with no context at all', () => {
		const result = ChatRequest.safeParse({
			messages: [{ id: '1', role: 'user', parts: [] }],
		});

		expect(result.success).toBe(true);
	});

	it('accepts a valid context.articleForm', () => {
		const result = ChatRequest.safeParse({
			messages: [{ id: '1', role: 'user', parts: [] }],
			context: {
				page: 'article-settings',
				articleForm: { title: 'x', status: 'draft', category: 'general', featured: false },
			},
		});

		expect(result.success).toBe(true);
	});

	it('rejects an articleForm missing a required field', () => {
		const result = ChatRequest.safeParse({
			messages: [{ id: '1', role: 'user', parts: [] }],
			context: {
				articleForm: { title: 'x', status: 'draft', category: 'general' }, // missing featured
			},
		});

		expect(result.success).toBe(false);
	});

	it('rejects an articleForm with an invalid status enum value', () => {
		const result = ChatRequest.safeParse({
			messages: [{ id: '1', role: 'user', parts: [] }],
			context: {
				articleForm: { title: 'x', status: 'archived', category: 'general', featured: false },
			},
		});

		expect(result.success).toBe(false);
	});
});
