import type { UIMessage } from 'ai';

// Error tool calls sent by the frontend carry `rawInput`, but the AI SDK's
// `convertToModelMessages` expects `input` to be populated (even for errored
// calls) to reconstruct the original tool-call arguments for the model. Without
// this fix-up, a message containing a previously-errored tool call would fail to
// convert.
export const fixErrorToolCalls = (messages: { [x: string]: unknown }[]): UIMessage[] => {
	return messages.map((msg) => {
		if (msg['role'] === 'assistant' && msg['parts'] && Array.isArray(msg['parts'])) {
			const fixedParts = (msg['parts'] as unknown[]).map((part) => {
				if (
					typeof part === 'object' &&
					part !== null &&
					'type' in part &&
					typeof part.type === 'string' &&
					part.type.startsWith('tool-') &&
					'state' in part &&
					part.state === 'output-error' &&
					'rawInput' in part &&
					(!('input' in part) || part.input == null)
				) {
					return { ...part, input: part.rawInput };
				}

				return part;
			});

			return { ...msg, parts: fixedParts };
		}

		return msg;
	}) as unknown as UIMessage[];
};
