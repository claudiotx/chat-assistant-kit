import type { LanguageModelMiddleware } from 'ai';
import { logger } from '../../logger.js';

let devToolsMiddleware: LanguageModelMiddleware | null = null;
let initPromise: Promise<void> | null = null;

async function doInit(): Promise<void> {
	if (process.env['AI_DEVTOOLS_ENABLED'] !== 'true') return;

	if (process.env['NODE_ENV'] === 'production') {
		logger.error('AI_DEVTOOLS_ENABLED is true but refused in production');
		return;
	}

	try {
		const { devToolsMiddleware: createDevToolsMiddleware } = await import('@ai-sdk/devtools');
		devToolsMiddleware = createDevToolsMiddleware();
		logger.info('AI DevTools middleware enabled. Run `npx @ai-sdk/devtools` and open http://localhost:4983');
	} catch (error) {
		logger.error('Failed to initialize AI DevTools middleware', { error: String(error) });
	}
}

export const initAIDevTools = async (): Promise<void> => {
	if (devToolsMiddleware) return;
	if (initPromise) return initPromise;

	const promise = doInit().finally(() => {
		initPromise = null;
	});

	initPromise = promise;

	return promise;
};

export const getDevToolsMiddleware = (): LanguageModelMiddleware | null => devToolsMiddleware;
