import React, { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import {
  Sparkles,
  Clock,
  User,
  Bot,
  Send,
  RefreshCw,
  HelpCircle,
  Check,
  AlertCircle,
  FileText,
  ShieldAlert
} from 'lucide-react';
import FormPanel, { type ArticleFormState } from './FormPanel';
import Login from './Login';
import './App.css';

const FORM_TOOL_NAMES = new Set(['read_settings_form', 'update_settings_form']);
const TOKEN_STORAGE_KEY = 'ai_assistant_token';

function getToolPartInfo(part: { type: string } & Record<string, any>) {
  if (part.type === 'dynamic-tool') {
    return {
      toolName: part.toolName as string,
      state: part.state,
      input: part.input,
      output: part.output,
      approval: part.approval,
    };
  }
  if (part.type.startsWith('tool-')) {
    return {
      toolName: part.type.slice('tool-'.length),
      state: part.state,
      input: part.input,
      output: part.output,
      approval: part.approval,
    };
  }
  return null;
}

interface Question {
  id: string;
  question: string;
  options?: string[];
}

interface AvailableModel {
  provider: string;
  model: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_STORAGE_KEY));
  const [input, setInput] = useState('');
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [model, setModel] = useState('gpt-4o-mini');
  // Mirrors FormPanel's current values (via onFormChange) so they can be sent
  // as `context` on every chat request — the assistant already knows what the
  // user is looking at instead of needing to call read_settings_form first.
  const [currentForm, setCurrentForm] = useState<ArticleFormState | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/models', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { models: AvailableModel[] }) => {
        if (!Array.isArray(data.models)) return;
        setAvailableModels(data.models);
        if (data.models.length > 0) {
          setModel((current) => (data.models.some((m) => m.model === current) ? current : data.models[0].model));
        }
      })
      .catch(() => {});
  }, [token]);

  const {
    messages,
    status,
    error,
    sendMessage,
    regenerate,
    addToolOutput,
    addToolApprovalResponse,
  } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:8000/api/chat',
      headers: { Authorization: `Bearer ${token}` },
      body: () => ({
        model,
        context: {
          page: 'article-settings',
          ...(currentForm ? { articleForm: currentForm } : {}),
        },
      }),
    }),
    sendAutomaticallyWhen: (opts) =>
      lastAssistantMessageIsCompleteWithToolCalls(opts) || lastAssistantMessageIsCompleteWithApprovalResponses(opts),
  });

  // State to hold answers for pending "ask_user" tool calls
  const [formAnswers, setFormAnswers] = useState<Record<string, Record<string, string>>>({});

  const handleAnswerChange = (toolCallId: string, questionId: string, value: string) => {
    setFormAnswers(prev => ({
      ...prev,
      [toolCallId]: {
        ...(prev[toolCallId] || {}),
        [questionId]: value
      }
    }));
  };

  const submitAskUserAnswers = (toolCallId: string, questions: Question[]) => {
    const answers = formAnswers[toolCallId] || {};

    // Validate that all questions have answers
    const unanswered = questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert("Please answer all questions before submitting.");
      return;
    }

    addToolOutput({
      tool: 'ask_user',
      toolCallId,
      output: answers,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  const handleSubmit = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };

  // Pull the latest Article Settings snapshot out of the transcript, if the
  // assistant has called `read_settings_form` / `update_settings_form`.
  const liveFormState = useMemo<ArticleFormState | null>(() => {
    let latest: ArticleFormState | null = null;
    for (const message of messages) {
      for (const part of message.parts as ({ type: string } & Record<string, any>)[]) {
        const info = getToolPartInfo(part);
        if (info && FORM_TOOL_NAMES.has(info.toolName) && info.state === 'output-available') {
          latest = info.output as ArticleFormState;
        }
      }
    }
    return latest;
  }, [messages]);

  if (!token) {
    return (
      <Login
        onLogin={(t) => {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <div className="app-container">
      <aside className="assistant-sidebar">
        <header className="assistant-header">
          <div className="header-title">
            <div className="icon-wrapper">
              <Sparkles size={18} className="animated-sparkle" />
            </div>
            <div>
              <h3>AI Assistant</h3>
              <span className="status-badge">
                <span className="dot online"></span>
                Node Sandbox
              </span>
            </div>
          </div>
          <button
            className="action-btn"
            onClick={() => window.location.reload()}
            title="Reset Chat"
          >
            <RefreshCw size={14} />
          </button>
        </header>

        <div className="model-picker">
          <label htmlFor="model-select">Model</label>
          <select id="model-select" value={model} onChange={(e) => setModel(e.target.value)}>
            {availableModels.length === 0 ? (
              <option value={model}>{model}</option>
            ) : (
              <optgroup label="OpenAI">
                {availableModels.map((m) => (
                  <option key={m.model} value={m.model}>
                    {m.model}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Message Panel */}
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-container">
                <Sparkles size={32} />
              </div>
              <h4>Start a Conversation</h4>
              <p>
                Ask the assistant anything! You can test server-side tools (e.g. asking for the time) or client-side tools (answering questionnaire prompts).
              </p>
              <div className="suggestions">
                <button onClick={() => setInput("Tell me a joke and run the server time tool")}>
                  "Tell me a joke and check server time"
                </button>
                <button onClick={() => setInput("I need to configure a new database connection")}>
                  "Configure database connection"
                </button>
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant';
                
                return (
                  <div key={message.id} className={`message-bubble-wrapper ${message.role}`}>
                    <div className="message-avatar">
                      {isAssistant ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    
                    <div className="message-bubble-content">
                      {message.parts.map((part, partIndex) => {
                        // Text part
                        if (part.type === 'text') {
                          return part.text ? (
                            <div key={`${message.id}-text-${partIndex}`} className="message-text">
                              {part.text}
                            </div>
                          ) : null;
                        }

                        // Tool part: either statically-typed `tool-${name}` or `dynamic-tool`
                        const toolInfo = getToolPartInfo(part);
                        if (!toolInfo) return null;

                        const toolCallId = (part as any).toolCallId as string;
                        const { toolName, state, input, output, approval } = toolInfo;
                        const isDone = state === 'output-available' || state === 'output-error' || state === 'output-denied';

                        // Handle server-side tool (get_server_time)
                        if (toolName === 'get_server_time') {
                          return (
                            <div key={toolCallId} className="tool-card server-tool">
                              <div className="tool-card-header">
                                <Clock size={14} className="tool-icon" />
                                <span>Tool Call: <code>get_server_time</code></span>
                                <span className={`tool-badge ${state}`}>
                                  {isDone ? 'Completed' : 'Running...'}
                                </span>
                              </div>
                              {state === 'output-available' && output && (
                                <div className="tool-card-body">
                                  <strong>Result:</strong>
                                  <pre>{JSON.stringify(output, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Handle the form read/write tools (see FormPanel)
                        if (toolName === 'read_settings_form' || toolName === 'update_settings_form') {
                          const needsApproval = state === 'approval-requested';

                          return (
                            <div key={toolCallId} className="tool-card server-tool">
                              <div className="tool-card-header">
                                {needsApproval ? (
                                  <ShieldAlert size={14} className="tool-icon" />
                                ) : (
                                  <FileText size={14} className="tool-icon" />
                                )}
                                <span>Tool Call: <code>{toolName}</code></span>
                                <span className={`tool-badge ${state}`}>
                                  {state === 'output-denied'
                                    ? 'Denied'
                                    : isDone
                                      ? 'Completed'
                                      : needsApproval
                                        ? 'Needs Approval'
                                        : 'Running...'}
                                </span>
                              </div>
                              {needsApproval && (
                                <div className="tool-card-body approval-body">
                                  <strong>Proposed change:</strong>
                                  <pre>{JSON.stringify(input, null, 2)}</pre>
                                  <div className="approval-actions">
                                    <button
                                      className="approve-btn"
                                      onClick={() => addToolApprovalResponse({ id: approval!.id, approved: true })}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="deny-btn"
                                      onClick={() => addToolApprovalResponse({ id: approval!.id, approved: false })}
                                    >
                                      Deny
                                    </button>
                                  </div>
                                </div>
                              )}
                              {state === 'output-available' && output && (
                                <div className="tool-card-body">
                                  <strong>Article Settings:</strong>
                                  <pre>{JSON.stringify(output, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Handle client-side tool (ask_user)
                        if (toolName === 'ask_user') {
                          const questions: Question[] = (input as any)?.questions || [];

                          return (
                            <div key={toolCallId} className="tool-card client-tool">
                              <div className="tool-card-header">
                                <HelpCircle size={14} className="tool-icon" />
                                <span>Clarification Questionnaire</span>
                                <span className={`tool-badge ${state}`}>
                                  {isDone ? 'Answered' : 'Action Required'}
                                </span>
                              </div>

                              <div className="tool-card-body">
                                {isDone ? (
                                  // Render submitted answers
                                  <div className="submitted-answers">
                                    <div className="submitted-header">
                                      <Check size={12} /> Answers Submitted:
                                    </div>
                                    <ul>
                                      {Object.entries(output || {}).map(([qId, val]) => (
                                        <li key={qId}>
                                          <strong>{qId}:</strong> {String(val)}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  // Render interactive form
                                  <div className="ask-user-form">
                                    {questions.map((q) => (
                                      <div key={q.id} className="form-group">
                                        <label className="form-label">{q.question}</label>

                                        {q.options && q.options.length > 0 ? (
                                          <div className="radio-options">
                                            {q.options.map(opt => (
                                              <label key={opt} className="radio-label">
                                                <input
                                                  type="radio"
                                                  name={`${toolCallId}-${q.id}`}
                                                  value={opt}
                                                  checked={formAnswers[toolCallId]?.[q.id] === opt}
                                                  onChange={(e) => handleAnswerChange(toolCallId, q.id, e.target.value)}
                                                />
                                                <span>{opt}</span>
                                              </label>
                                            ))}
                                          </div>
                                        ) : (
                                          <input
                                            type="text"
                                            className="text-input-field"
                                            placeholder="Type your response..."
                                            value={formAnswers[toolCallId]?.[q.id] || ''}
                                            onChange={(e) => handleAnswerChange(toolCallId, q.id, e.target.value)}
                                          />
                                        )}
                                      </div>
                                    ))}
                                    <button
                                      className="form-submit-btn"
                                      onClick={() => submitAskUserAnswers(toolCallId, questions)}
                                    >
                                      Submit Answers
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Fallback generic tool render
                        return (
                          <div key={toolCallId} className="tool-card generic-tool">
                            <div className="tool-card-header">
                              <span>Tool: <code>{toolName}</code></span>
                              <span className="tool-badge">{state}</span>
                            </div>
                            <pre>{JSON.stringify(input, null, 2)}</pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {status === 'submitted' && (
                <div className="message-bubble-wrapper assistant loading">
                  <div className="message-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="message-bubble-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="error-alert">
            <AlertCircle size={14} />
            <span>Connection Error. Make sure the backend server is running on port 8000.</span>
            <button onClick={() => regenerate()} className="retry-inline-btn">Retry</button>
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="input-form">
          <input 
            type="text" 
            value={input} 
            onChange={handleInputChange} 
            placeholder="Ask a question..."
            disabled={status === 'submitted'}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || status === 'submitted'} 
            className="send-btn"
          >
            <Send size={16} />
          </button>
        </form>
      </aside>

      <FormPanel liveState={liveFormState} token={token} onFormChange={setCurrentForm} />
    </div>
  );
}
