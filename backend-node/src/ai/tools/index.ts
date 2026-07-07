import { tool, type Tool } from 'ai';
import { z } from 'zod';
import { logger } from '../../logger.js';
import { getServerTime } from './get-server-time.js';
import { readSettingsForm, updateSettingsForm } from './settings-form.js';
import type { ToolConfig } from './types.js';

// Server-side tools: each one is executed here and its result is fed back to the
// model automatically. To add a new one, drop a `defineTool(...)` file next to
// these and append it to this array.
export const SERVER_TOOLS: ToolConfig<any>[] = [getServerTime, readSettingsForm, updateSettingsForm];

const toolConfigToAiSdkTool = (config: ToolConfig<any>, sessionId: string): Tool<unknown, unknown> =>
	tool({
		description: config.description,
		inputSchema: config.inputSchema,
		needsApproval: config.needsApproval ?? false,
		execute: async (args) => {
			logger.info(`tool call: ${config.name}`, { sessionId, args });

			try {
				const result = await config.handler({ args, sessionId });
				logger.info(`tool result: ${config.name}`, { sessionId, result });
				return result;
			} catch (error) {
				logger.error(`tool error: ${config.name}`, { sessionId, error: String(error) });
				throw error;
			}
		},
	});

// Client-side tool: no `execute`, so the AI SDK suspends the stream and lets the
// React client render a form and resolve the result via `addToolOutput`.
export const askUserTool = tool({
	description:
		'Ask the user questions to resolve ambiguity or get requirements. DO NOT execute this on the server. The client will render a UI form and return the answers.',
	inputSchema: z.object({
		questions: z.array(
			z.object({
				id: z.string().describe('Unique key for this question'),
				question: z.string().describe('Question text to display'),
				options: z.array(z.string()).optional().describe('Optional multiple choice options'),
			}),
		),
	}),
});

// Tools are built per-request so each tool's `execute` closes over the caller's
// sessionId — this is what keeps `update_settings_form`/`read_settings_form`
// scoped to the right user instead of a single shared global.
export const buildToolsForSession = (sessionId: string): Record<string, Tool<unknown, unknown>> => ({
	...Object.fromEntries(SERVER_TOOLS.map((config) => [config.name, toolConfigToAiSdkTool(config, sessionId)])),
	ask_user: askUserTool as unknown as Tool<unknown, unknown>,
});
