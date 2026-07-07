import { createOpenAI } from '@ai-sdk/openai';
import { HttpError } from '../../http-error.js';

const DEFAULT_ALLOWED_MODELS = 'gpt-4o-mini,gpt-4o';

export const getAllowedModels = (): string[] =>
	(process.env['ALLOWED_MODELS'] ?? DEFAULT_ALLOWED_MODELS).split(',').map((model) => model.trim());

export const resolveLanguageModel = (model: string) => {
	if (!getAllowedModels().includes(model)) {
		throw new HttpError(400, `Model "${model}" is not in the allowed list`);
	}

	const apiKey = process.env['OPENAI_API_KEY'];

	if (!apiKey) {
		throw new HttpError(500, 'OPENAI_API_KEY is not set');
	}

	const openai = createOpenAI({ apiKey });

	return openai(model);
};
