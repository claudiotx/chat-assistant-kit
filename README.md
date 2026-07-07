# AI Assistant Sandbox (Node + React)

Express + the AI SDK (`ai`, `@ai-sdk/openai`) on the backend, React (`@ai-sdk/react`) on the frontend. No hand-rolled protocol — the backend streams the SDK's own UI Message Stream.

## Structure

- `backend-node/src/ai/chat/` — router → controller → `streamText` call
- `backend-node/src/ai/tools/` — `get_server_time` (server-side), `ask_user` (client-side)
- `frontend/src/App.tsx` — chat UI using `useChat`

## Run

**1. Backend**

```bash
cd backend-node
npm install
npm run dev
```

Runs on `http://localhost:8000`. Set `OPENAI_API_KEY` in `backend-node/.env` (copy `.env.example` if starting fresh).

**2. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`).

## How the tools work

- **`get_server_time`** (server-side): the backend executes it directly and streams the result back; the LLM continues in the same request.
- **`ask_user`** (client-side): the LLM pauses the stream, React renders a form, and submitting it calls `addToolOutput` to resume the conversation.

## Tests

```bash
cd backend-node
npm test
```

| File | What it proves |
|---|---|
| `session/session-store.test.ts` | Two sessions never share state — the actual multi-user bug this whole effort started from |
| `ai/tools/settings-form.test.ts` | The empty-string clobbering bug stays fixed (regression test), `needsApproval` is set correctly |
| `auth/jwt.test.ts` | Sign/verify round-trips, rejects forged/malformed/expired tokens |
| `ai/providers/index.test.ts` | Model allowlist actually blocks disallowed models with the right status code |
| `rate-limit.test.ts` | Sliding window allows/blocks/resets, keys stay independent |
| `ai/chat/utils/fix-error-tool-calls.test.ts` | Ported directly from Directus's own test file — same logic, same cases |
| `ai/chat/utils/format-context.test.ts` | Includes a prompt-injection test: a title containing `</user_context>` gets escaped, can't break out of the tag |
| `ai/chat/models/chat-request.test.ts` | Schema validation, plus a regression guard for the zod v3 `.passthrough()` vs v4 `z.looseObject()` mistake that would've broken at import time |
| `ai/chat/controllers/chat.post.test.ts` | Mirrors Directus's own testing style (mocked deps, fake req/res) — validation, auth wiring, and that errors map to the right status without leaking internals |
