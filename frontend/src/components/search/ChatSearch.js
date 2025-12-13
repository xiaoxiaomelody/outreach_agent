import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import "./ChatSearch.css";
import Icon from "../icons/Icon";
import { useChatStream } from "../../hooks/useChatStream";

/**
 * Chat Search Component
 * AI-powered chat interface for finding contacts with streaming responses
 */
const ChatSearch = ({ onContactsFound }) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatContainerRef = useRef(null);

  const {
    messages,
    isStreaming,
    status,
    error,
    sendMessage,
    clearMessages,
    cancelStream,
  } = useChatStream();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(userMessage);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  // Handle clear history
  const handleClearHistory = () => {
    if (window.confirm("Clear all chat history?")) {
      clearMessages();
    }
  };

  // Quick suggestions for new users
  const suggestions = [
    "Find 5 engineers at Stripe",
    "Show me marketing people at Google",
    "Get executives at Microsoft",
    "Find sales contacts at HubSpot",
  ];

  // Check if we should show welcome screen
  const showWelcome = messages.length === 0;

  return (
    <div className="chat-container" ref={chatContainerRef}>
      {/* Header with clear button */}
      <div className="chat-header">
        <div className="chat-header-left">
          <Icon name="chat" size={20} />
          <span>AI Contact Finder</span>
        </div>
        {messages.length > 0 && (
          <button
            className="clear-history-btn"
            onClick={handleClearHistory}
            title="Clear chat history"
          >
            <Icon name="trash" size={16} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="chat-messages-area">
        {showWelcome ? (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <Icon name="search" size={48} />
            </div>
            <h2>Find Business Contacts</h2>
            <p>
              Ask me to find contacts at any company. I can search by role,
              department, or seniority level.
            </p>
            <div className="welcome-suggestions">
              <p className="suggestions-label">Try asking:</p>
              <div className="suggestion-chips">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="suggestion-chip"
                    disabled={isStreaming}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onContactsFound={onContactsFound}
              />
            ))}

            {/* Status indicator */}
            {status && (
              <StatusIndicator status={status} />
            )}

            {/* Error display */}
            {error && (
              <div className="error-message-bubble">
                <Icon name="warning" size={16} />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {/* Quick examples when not in welcome screen */}
        {!showWelcome && messages.length > 0 && (
          <div className="quick-chips">
            {suggestions.slice(0, 3).map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(example)}
                className="quick-chip"
                disabled={isStreaming}
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to find contacts... (e.g., 'Find 10 engineers at Google')"
              className="chat-textarea"
              disabled={isStreaming}
              rows={1}
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={cancelStream}
                className="cancel-btn"
                title="Stop generating"
              >
                <Icon name="close" size={20} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="send-btn"
                title="Send message"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            )}
          </div>
          <p className="input-hint">
            Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line
          </p>
        </form>
      </div>
    </div>
  );
};

/**
 * Message Bubble Component
 * Renders individual chat messages with proper styling
 */
const MessageBubble = ({ message, onContactsFound }) => {
  const { role, content, isStreaming, hasError, toolResult } = message;

  // User message - right aligned, blue bubble
  if (role === "user") {
    return (
      <div className="message-row message-row-user">
        <div className="message-bubble message-bubble-user">
          <div className="message-text">{content}</div>
        </div>
      </div>
    );
  }

  // System/tool message
  if (role === "system" || role === "tool") {
    return (
      <div className="message-row message-row-system">
        <div className="system-message">
          {content}
        </div>
      </div>
    );
  }

  // Assistant message - left aligned, supports markdown
  return (
    <div className="message-row message-row-assistant">
      <div className="assistant-avatar">
        <Icon name="bot" size={20} />
      </div>
      <div className={`message-bubble message-bubble-assistant ${hasError ? 'has-error' : ''}`}>
        <div className="message-text">
          {content ? (
            <ReactMarkdown
              components={{
                // Custom renderers for better styling
                p: ({ children }) => <p className="md-paragraph">{children}</p>,
                strong: ({ children }) => <strong className="md-bold">{children}</strong>,
                em: ({ children }) => <em className="md-italic">{children}</em>,
                ul: ({ children }) => <ul className="md-list">{children}</ul>,
                ol: ({ children }) => <ol className="md-list md-list-ordered">{children}</ol>,
                li: ({ children }) => <li className="md-list-item">{children}</li>,
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="md-code-inline">{children}</code>
                  ) : (
                    <pre className="md-code-block"><code>{children}</code></pre>
                  ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          ) : isStreaming ? (
            <span className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </span>
          ) : (
            <span className="empty-message">Thinking...</span>
          )}
        </div>

        {/* Show contacts preview if tool result available */}
        {toolResult && toolResult.contacts && toolResult.contacts.length > 0 && (
          <div className="contacts-preview">
            <div className="contacts-preview-header">
              <span>📇 Found {toolResult.resultCount} contacts</span>
              {onContactsFound && (
                <button
                  className="view-all-btn"
                  onClick={() => onContactsFound(toolResult.contacts)}
                >
                  View All →
                </button>
              )}
            </div>
            <div className="contacts-preview-list">
              {toolResult.contacts.slice(0, 3).map((contact, i) => (
                <div key={i} className="contact-preview-item">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-position">{contact.position}</div>
                  <div className="contact-email">{contact.email}</div>
                </div>
              ))}
              {toolResult.contacts.length > 3 && (
                <div className="more-contacts">
                  +{toolResult.contacts.length - 3} more contacts
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Status Indicator Component
 * Shows real-time status updates (thinking, searching, etc.)
 */
const StatusIndicator = ({ status }) => {
  if (!status) return null;

  // Handle both string and object status
  const message = typeof status === 'string' ? status : status.message;
  const type = typeof status === 'string' ? 'processing' : (status.type || 'processing');

  // Get icon based on status type
  const getStatusIcon = () => {
    switch (type) {
      case 'thinking':
        return <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>;
      case 'loading':
      case 'processing':
      case 'searching':
        return <span className="spinner" />;
      case 'generating':
        return <span className="pulse-icon">✨</span>;
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  // Get CSS class based on status type
  const getStatusClass = () => {
    switch (type) {
      case 'success':
        return 'status-success';
      case 'warning':
        return 'status-warning';
      case 'error':
        return 'status-error';
      case 'searching':
        return 'status-searching';
      default:
        return 'status-default';
    }
  };

  return (
    <div className={`status-message ${getStatusClass()}`}>
      <div className="status-content">
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{message}</span>
      </div>
    </div>
  );
};

export default ChatSearch;
