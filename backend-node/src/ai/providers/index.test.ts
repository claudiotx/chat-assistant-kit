import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../http-error.js';
import { getAllowedModels, resolveLanguageModel } from './index.js';

describe('getAllowedModels', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('defaults to gpt-4o-mini and gpt-4o when ALLOWED_MODELS is unset', () => {
		vi.stubEnv('ALLOWED_MODELS', undefined);
		expect(getAllowedModels()).toEqual(['gpt-4o-mini', 'gpt-4o']);
	});

	it('parses and trims a custom comma-separated list', () => {
		vi.stubEnv('ALLOWED_MODELS', ' gpt-4o ,claude-x, gemini-y ');
		expect(getAllowedModels()).toEqual(['gpt-4o', 'claude-x', 'gemini-y']);
	});
});

describe('resolveLanguageModel', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('rejects a model not in the allowlist with a 400 HttpError', () => {
		vi.stubEnv('ALLOWED_MODELS', 'gpt-4o-mini');
		vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

		expect(() => resolveLanguageModel('gpt-3.5-turbo')).toThrow(HttpError);

		try {
			resolveLanguageModel('gpt-3.5-turbo');
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(HttpError);
			expect((error as HttpError).statusCode).toBe(400);
		}
	});

	it('rejects with a 500 HttpError when OPENAI_API_KEY is missing, even for an allowed model', () => {
		vi.stubEnv('ALLOWED_MODELS', 'gpt-4o-mini');
		vi.stubEnv('OPENAI_API_KEY', '');

		try {
			resolveLanguageModel('gpt-4o-mini');
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(HttpError);
			expect((error as HttpError).statusCode).toBe(500);
		}
	});

	it('resolves without throwing for an allowed model with a key present', () => {
		vi.stubEnv('ALLOWED_MODELS', 'gpt-4o-mini');
		vi.stubEnv('OPENAI_API_KEY', 'sk-test-key');

		expect(() => resolveLanguageModel('gpt-4o-mini')).not.toThrow();
	});
});
