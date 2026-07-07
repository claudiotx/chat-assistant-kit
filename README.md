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
