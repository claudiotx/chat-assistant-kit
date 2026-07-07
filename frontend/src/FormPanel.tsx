import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

export interface ArticleFormState {
  title: string;
  status: 'draft' | 'in_review' | 'published';
  category: string;
  featured: boolean;
}

const FORM_API = 'http://localhost:8000/api/form-state';

interface FormPanelProps {
  // Latest form state extracted from a completed `read_settings_form` /
  // `update_settings_form` tool call in the chat, if any. Backend is the
  // source of truth either way; this just lets the panel react immediately
  // instead of waiting on a manual refetch.
  liveState: ArticleFormState | null;
  token: string;
  // Notifies the parent of the form's current values, so they can be sent as
  // chat context (see App.tsx).
  onFormChange?: (form: ArticleFormState) => void;
}

export default function FormPanel({ liveState, token, onFormChange }: FormPanelProps) {
  const [form, setForm] = useState<ArticleFormState | null>(null);
  const [saving, setSaving] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(FORM_API, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setForm)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (liveState) setForm(liveState);
  }, [liveState]);

  useEffect(() => {
    if (form) onFormChange?.(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const save = async (next: ArticleFormState) => {
    setForm(next);
    setSaving(true);
    try {
      const res = await fetch(FORM_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(next),
      });
      if (res.ok) setForm(await res.json());
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <main className="form-workspace">
        <p>Loading form…</p>
      </main>
    );
  }

  return (
    <main className="form-workspace">
      <div className="form-card">
        <div className="form-card-header">
          <FileText size={18} />
          <h2>Article Settings</h2>
          {saving && <span className="saving-pill">Saving…</span>}
        </div>
        <p className="form-card-subtitle">
          This form's state lives on the backend. Ask the assistant to read or change it
          (e.g. "set the title to Hello World and mark it featured") and watch it update here live.
        </p>

        <div className="form-field">
          <label>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onBlur={() => save(form)}
          />
        </div>

        <div className="form-field">
          <label>Status</label>
          <select
            value={form.status}
            onChange={(e) => save({ ...form, status: e.target.value as ArticleFormState['status'] })}
          >
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="form-field">
          <label>Category</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            onBlur={() => save(form)}
          />
        </div>

        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => save({ ...form, featured: e.target.checked })}
          />
          <span>Featured</span>
        </label>
      </div>
    </main>
  );
}
