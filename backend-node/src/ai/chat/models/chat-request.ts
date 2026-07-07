import { z } from 'zod';

export const ChatContext = z.object({
	page: z.string().optional(),
	articleForm: z
		.object({
			title: z.string(),
			status: z.enum(['draft', 'in_review', 'published']),
			category: z.string(),
			featured: z.boolean(),
		})
		.optional(),
});

export type ChatContext = z.infer<typeof ChatContext>;

// `.passthrough()`, not zod v4's `z.looseObject({})` — this project is on zod v3.
export const ChatRequest = z.object({
	model: z.string().default('gpt-4o-mini'),
	messages: z.array(z.object({}).passthrough()).min(1),
	context: ChatContext.optional(),
});

export type ChatRequest = z.infer<typeof ChatRequest>;
