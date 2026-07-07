import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as articleForm from '../../state/article-form.js';

vi.mock('../../state/article-form.js', () => ({
	getArticleForm: vi.fn(),
	updateArticleForm: vi.fn(),
}));

describe('readSettingsForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('is auto-executing (no needsApproval) — it only reads', async () => {
		const { readSettingsForm } = await import('./settings-form.js');
		expect(readSettingsForm.needsApproval).toBeUndefined();
	});

	it("reads the caller's own session, not a hardcoded one", async () => {
		const { readSettingsForm } = await import('./settings-form.js');
		vi.mocked(articleForm.getArticleForm).mockReturnValue({
			title: 'x',
			status: 'draft',
			category: 'general',
			featured: false,
		});

		await readSettingsForm.handler({ args: {}, sessionId: 'session-123' });

		expect(articleForm.getArticleForm).toHaveBeenCalledWith('session-123');
	});
});

describe('updateSettingsForm', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('requires approval — it mutates shared state', async () => {
		const { updateSettingsForm } = await import('./settings-form.js');
		expect(updateSettingsForm.needsApproval).toBe(true);
	});

	it(
		'regression: drops empty-string fields instead of clobbering existing values — ' +
			'the model sometimes sends "" for fields it does not intend to change',
		async () => {
			const { updateSettingsForm } = await import('./settings-form.js');
			vi.mocked(articleForm.updateArticleForm).mockReturnValue({
				title: 'Launch Day',
				status: 'draft',
				category: 'general',
				featured: true,
			});

			await updateSettingsForm.handler({
				args: { title: 'Launch Day', category: '', featured: true },
				sessionId: 'session-123',
			});

			expect(articleForm.updateArticleForm).toHaveBeenCalledWith('session-123', {
				title: 'Launch Day',
				featured: true,
			});
		},
	);

	it('passes through a legitimate empty-string-free patch unchanged', async () => {
		const { updateSettingsForm } = await import('./settings-form.js');
		vi.mocked(articleForm.updateArticleForm).mockReturnValue({
			title: 'x',
			status: 'published',
			category: 'general',
			featured: false,
		});

		await updateSettingsForm.handler({ args: { status: 'published' }, sessionId: 'session-123' });

		expect(articleForm.updateArticleForm).toHaveBeenCalledWith('session-123', { status: 'published' });
	});

	it('drops undefined fields too (omitted optional fields)', async () => {
		const { updateSettingsForm } = await import('./settings-form.js');
		vi.mocked(articleForm.updateArticleForm).mockReturnValue({
			title: 'x',
			status: 'draft',
			category: 'general',
			featured: false,
		});

		await updateSettingsForm.handler({
			args: { title: undefined, featured: false },
			sessionId: 'session-123',
		});

		expect(articleForm.updateArticleForm).toHaveBeenCalledWith('session-123', { featured: false });
	});
});
