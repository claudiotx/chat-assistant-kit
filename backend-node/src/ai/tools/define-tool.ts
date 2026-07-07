import type { ToolConfig } from './types.js';

// Identity function: exists purely so a new tool file gets full type inference
// on `args` in `handler` without having to spell out the generic by hand.
export function defineTool<T>(tool: ToolConfig<T>): ToolConfig<T> {
	return tool;
}
