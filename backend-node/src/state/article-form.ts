import { createSessionStore } from '../session/session-store.js';

export interface ArticleFormState {
	title: string;
	status: 'draft' | 'in_review' | 'published';
	category: string;
	featured: boolean;
}

// Per-session in-memory record standing in for a database row, scoped by sessionId
// so concurrent users (or tabs) don't clobber each other's data. This is what both
// the AI tools and the plain REST endpoint read from and write to, so a tool call
// and a manual edit in the UI are just two ways of mutating the same state.
const store = createSessionStore<ArticleFormState>(() => ({
	title: 'Untitled article',
	status: 'draft',
	category: 'general',
	featured: false,
}));

export const getArticleForm = (sessionId: string): ArticleFormState => store.get(sessionId);

export const updateArticleForm = (sessionId: string, patch: Partial<ArticleFormState>): ArticleFormState =>
	store.update(sessionId, patch);
