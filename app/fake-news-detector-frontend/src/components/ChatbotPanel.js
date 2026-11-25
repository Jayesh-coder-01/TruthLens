import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { ArrowClockwise, ChatDots, ExclamationTriangleFill, Send, XCircle } from 'react-bootstrap-icons';

import { apiClient, extractApiError } from '../api/client';

const STARTER_PROMPTS = [
  'What does this classifier result mean and what are its limits?',
  'Give me a step-by-step checklist to verify a breaking news claim.',
  'How do I distinguish factual reporting from opinion or sensationalism?',
  'Why is an ML model score not proof that an article is true or false?',
];

const MAX_CHAT_LENGTH = 2000;

function ChatbotPanel({ analysisContext = null, onClearContext = null }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState('');
  const [assistantStatus, setAssistantStatus] = useState({ checked: false, configured: true, model: '' });

  const endRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get('/api/chat/status/')
      .then((res) => {
        if (active) {
          setAssistantStatus({
            checked: true,
            configured: Boolean(res.data?.configured),
            model: res.data?.model || '',
          });
        }
      })
      .catch(() => {
        if (active) {
          setAssistantStatus({ checked: true, configured: false, model: '' });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  const buildSanitizedContext = () => {
    if (!analysisContext) return null;
    const ctx = {};
    if (analysisContext.input_text) ctx.input_text = analysisContext.input_text;
    if (analysisContext.predicted_label) ctx.predicted_label = analysisContext.predicted_label;
    if (analysisContext.raw_class === 0 || analysisContext.raw_class === 1) {
      ctx.raw_class = analysisContext.raw_class;
    }
    if (typeof analysisContext.model_score === 'number') {
      ctx.model_score = analysisContext.model_score;
    }
    if (analysisContext.model_scores) {
      ctx.model_scores = analysisContext.model_scores;
    }
    return Object.keys(ctx).length > 0 ? ctx : null;
  };

  const sendMessage = async (textToSend) => {
    const cleaned = textToSend.trim();
    if (!cleaned) {
      setErrorMessage('Please enter a message before sending.');
      return;
    }
    if (cleaned.length > MAX_CHAT_LENGTH) {
      setErrorMessage(`Message exceeds maximum length of ${MAX_CHAT_LENGTH} characters.`);
      return;
    }

    const historySnapshot = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg = { role: 'user', content: cleaned };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setErrorMessage('');
    setLastFailedMessage('');
    setIsSending(true);

    try {
      const response = await apiClient.post(
        '/api/chat/',
        {
          message: cleaned,
          history: historySnapshot,
          analysis_context: buildSanitizedContext(),
        },
        { timeout: 30000 }
      );
      const replyText = response.data?.reply;
      if (!replyText) {
        throw new Error('Empty reply received from server.');
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: replyText,
          model: response.data?.model,
        },
      ]);
    } catch (err) {
      setErrorMessage(
        extractApiError(err, 'Unable to get a response from the Media Literacy Assistant.')
      );
      setLastFailedMessage(cleaned);
      setMessages((prev) => prev.slice(0, -1));
      setDraft(cleaned);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(draft);
  };

  return (
    <div>
      {assistantStatus.checked && !assistantStatus.configured && (
        <Alert variant="warning" className="small mb-3">
          <strong>Gemini API Key Not Detected:</strong> Set <code>GEMINI_API_KEY</code> in the
          backend <code>.env</code> file and restart Django to enable live Gemini responses.
        </Alert>
      )}

      {analysisContext && (
        <div className="tl-notice tl-notice-info mb-3 justify-content-between align-items-center">
          <div className="small">
            <strong>Attached Classifier Context:</strong> &ldquo;{analysisContext.input_text}&rdquo;
            {' — '}
            Predicted as <strong>{analysisContext.predicted_label}</strong> (raw class{' '}
            {analysisContext.raw_class}, model score{' '}
            {typeof analysisContext.model_score === 'number'
              ? analysisContext.model_score.toFixed(4)
              : 'N/A'}
            )
          </div>
          {onClearContext && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 text-decoration-none flex-shrink-0"
              onClick={onClearContext}
              aria-label="Clear attached classifier context"
            >
              <XCircle size={18} />
            </Button>
          )}
        </div>
      )}

      <div className="tl-chat-shell" aria-label="Media Literacy Assistant conversation">
        <div className="tl-chat-messages">
          {messages.length === 0 && (
            <div className="my-auto text-center px-3">
              <ChatDots size={28} className="text-primary mb-2" aria-hidden="true" />
              <h2 className="h5 mb-2">Media Literacy Assistant</h2>
              <p className="text-muted small mx-auto" style={{ maxWidth: '54ch' }}>
                Ask how to verify a claim, interpret a classifier prediction, or spot manipulative
                framing. Powered by Google Gemini on the backend with no live web browsing.
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                {STARTER_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    type="button"
                    className="tl-example-chip"
                    onClick={() => sendMessage(prompt)}
                    disabled={isSending}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`tl-chat-bubble ${
                msg.role === 'user' ? 'tl-chat-user' : 'tl-chat-assistant'
              }`}
            >
              {msg.content}
            </div>
          ))}

          {isSending && (
            <div className="tl-chat-bubble tl-chat-assistant d-flex align-items-center gap-2 text-muted">
              <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
              <span>Thinking...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="tl-chat-input-bar">
          {errorMessage && (
            <Alert
              variant="danger"
              role="alert"
              className="py-2 px-3 small mb-2 d-flex justify-content-between align-items-center gap-2"
            >
              <span>{errorMessage}</span>
              {lastFailedMessage && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline-danger"
                  onClick={() => sendMessage(lastFailedMessage)}
                  disabled={isSending}
                >
                  <ArrowClockwise className="me-1" aria-hidden="true" />
                  Retry
                </Button>
              )}
            </Alert>
          )}

          <Form onSubmit={handleSubmit} className="d-flex gap-2 align-items-end">
            <Form.Group className="flex-grow-1" controlId="assistant-message-input">
              <Form.Label className="visually-hidden">Ask the Media Literacy Assistant</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ask how to verify a headline, interpret a score, or check primary sources..."
                value={draft}
                maxLength={MAX_CHAT_LENGTH}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={isSending}
              />
            </Form.Group>
            <Button
              type="submit"
              variant="primary"
              className="tl-btn-primary d-inline-flex align-items-center gap-1"
              disabled={isSending}
            >
              <Send aria-hidden="true" />
              <span>Send</span>
            </Button>
          </Form>
        </div>
      </div>

      <div className="tl-notice mt-3" role="note">
        <ExclamationTriangleFill size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
        <div className="small">
          The assistant explains media-literacy practices and model limits. It does not browse the
          live internet, verify breaking facts, or fabricate sources, and its explanations are not
          the ML classifier&rsquo;s internal feature reasoning.
        </div>
      </div>
    </div>
  );
}

export default ChatbotPanel;
