import type { ZodType } from 'zod';

export interface ToolConfig<T> {
	name: string;
	description: string;
	inputSchema: ZodType<T>;
	handler: (options: { args: T; sessionId: string }) => Promise<unknown>;
	// Tools that mutate state should require explicit user confirmation before
	// they execute. When true, the AI SDK suspends the tool call in an
	// `approval-requested` state until the client responds.
	needsApproval?: boolean;
}
