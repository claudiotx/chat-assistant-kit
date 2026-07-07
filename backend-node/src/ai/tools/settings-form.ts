import { z } from 'zod';
import { getArticleForm, updateArticleForm } from '../../state/article-form.js';
import { defineTool } from './define-tool.js';

export const readSettingsForm = defineTool({
	name: 'read_settings_form',
	description: 'Read the current values of the Article Settings form shown in the UI.',
	inputSchema: z.object({}),
	handler: async ({ sessionId }) => getArticleForm(sessionId),
});

const updateSettingsFormSchema = z
	.object({
		title: z.string().optional().describe('The article title'),
		status: z.enum(['draft', 'in_review', 'published']).optional(),
		category: z.string().optional(),
		featured: z.boolean().optional(),
	})
	.describe('Only include the fields you want to change; omitted fields are left untouched.');

export const updateSettingsForm = defineTool({
	name: 'update_settings_form',
	description:
		'Update one or more fields of the Article Settings form shown in the UI. The change is applied immediately and reflected live in the form.',
	inputSchema: updateSettingsFormSchema,
	// Mutates shared state: require explicit user confirmation before it runs.
	needsApproval: true,
	handler: async ({ args, sessionId }) => {
		// Models sometimes send an empty string for fields they don't actually intend
		// to change (instead of omitting the key). Treat that as "no change" rather
		// than clobbering the existing value.
		const patch = Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined && value !== ''));

		return updateArticleForm(sessionId, patch);
	},
});
