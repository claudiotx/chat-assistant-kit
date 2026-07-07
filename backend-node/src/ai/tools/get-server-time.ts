import { z } from 'zod';
import { defineTool } from './define-tool.js';

export const getServerTime = defineTool({
	name: 'get_server_time',
	description: 'Returns the current server time.',
	inputSchema: z.object({}),
	handler: async () => ({ time: new Date().toISOString() }),
});
