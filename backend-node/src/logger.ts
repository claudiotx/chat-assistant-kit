const timestamp = () => new Date().toISOString();

export const logger = {
	info: (message: string, meta?: Record<string, unknown>) => {
		console.log(`[${timestamp()}] ${message}`, meta ?? '');
	},
	error: (message: string, meta?: Record<string, unknown>) => {
		console.error(`[${timestamp()}] ${message}`, meta ?? '');
	},
};
