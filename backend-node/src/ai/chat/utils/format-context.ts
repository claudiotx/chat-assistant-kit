import type { ChatContext } from '../models/chat-request.js';

// User-controlled values get woven into the system prompt below, so they're
// escaped to stop crafted field values (e.g. a title containing `</user_context>`)
// from breaking out of the tag and injecting fake instructions.
function escapeAngleBrackets(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatContextForSystemPrompt(context: ChatContext): string {
	const sections: string[] = [];

	if (context.page) {
		sections.push(`## Current Page\nPath: ${escapeAngleBrackets(context.page)}`);
	}

	if (context.articleForm) {
		sections.push(
			`## Current Article Settings Form\nThe user is looking at this form right now; these are its live values.\n\`\`\`json\n${escapeAngleBrackets(JSON.stringify(context.articleForm, null, 2))}\n\`\`\``,
		);
	}

	if (sections.length === 0) return '';

	return `\n\n<user_context>\n${sections.join('\n\n')}\n</user_context>`;
}
