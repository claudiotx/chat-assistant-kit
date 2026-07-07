import { convertToModelMessages, stepCountIs, streamText, wrapLanguageModel, type StreamTextResult, type Tool, type UIMessage } from 'ai';
import { getDevToolsMiddleware } from '../../devtools/index.js';
import { logger } from '../../../logger.js';
import { resolveLanguageModel } from '../../providers/index.js';
import { getAITelemetryConfig } from '../../../telemetry/index.js';
import { SYSTEM_PROMPT } from '../constants/system-prompt.js';
import type { ChatContext } from '../models/chat-request.js';
import { formatContextForSystemPrompt } from '../utils/format-context.js';

export interface CreateUiStreamOptions {
	model: string;
	tools: { [x: string]: Tool };
	context?: ChatContext;
}

export const createUiStream = async (
	messages: UIMessage[],
	{ model, tools, context }: CreateUiStreamOptions,
): Promise<StreamTextResult<Record<string, Tool<any, any>>, any, any>> => {
	let languageModel = resolveLanguageModel(model);
	const modelMessages = await convertToModelMessages(messages, { tools });
	const systemPrompt = SYSTEM_PROMPT + (context ? formatContextForSystemPrompt(context) : '');
	const telemetry = getAITelemetryConfig();

	const devToolsMiddleware = getDevToolsMiddleware();

	if (devToolsMiddleware) {
		languageModel = wrapLanguageModel({ model: languageModel, middleware: devToolsMiddleware });
	}

	const stream = streamText({
		system: systemPrompt,
		model: languageModel,
		messages: modelMessages,
		stopWhen: [stepCountIs(10)],
		tools,
		...(telemetry ? { telemetry } : {}),
		// NOTE: `experimental_toolApprovalSecret` (HMAC-signs each approval request
		// and verifies the signature on the client's response) was tried here but
		// is not usable with the installed ai@7.0.16 client: `addToolApprovalResponse`
		// rebuilds the approval object as `{id, approved, reason}` and drops the
		// original `signature`, with no way for the caller to supply it back
		// (confirmed by reading node_modules/ai/dist/index.js) — every approval
		// fails signature verification. The real protection mechanism is
		// `needsApproval: true` on the tool itself: `update_settings_form` genuinely
		// cannot execute until the client sends an explicit approved response, which
		// is verified working end-to-end. Revisit `experimental_toolApprovalSecret`
		// once that client-side bug is fixed upstream.
		onFinish: ({ finishReason, usage, steps }) => {
			logger.info('chat stream finished', { finishReason, usage, steps: steps.length });
		},
	});

	return stream as StreamTextResult<Record<string, Tool<any, any>>, any, any>;
};
