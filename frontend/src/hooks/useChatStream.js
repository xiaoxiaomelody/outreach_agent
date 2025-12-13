import { useState, useCallback, useRef } from 'react';
import { auth } from '../config/firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

/**
 * Custom hook for streaming chat with SSE
 * Handles the POST /api/chat/stream endpoint with real-time updates
 */
/**
 * Status types from backend
 * @typedef {'thinking' | 'loading' | 'processing' | 'searching' | 'generating' | 'success' | 'warning' | 'error'} StatusType
 */

export function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(null);      // { message: string, type: StatusType }
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Add a new message to the list
   */
  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, { ...message, id: Date.now() + Math.random() }]);
  }, []);

  /**
   * Update the last assistant message (for streaming typewriter effect)
   */
  const updateLastAssistantMessage = useCallback((contentChunk) => {
    setMessages((prev) => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
        const updated = [...prev];
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: (updated[lastIndex].content || '') + contentChunk,
        };
        return updated;
      }
      return prev;
    });
  }, []);

  /**
   * Parse SSE event data
   */
  const parseSSEEvent = (text) => {
    const lines = text.split('\n');
    let event = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data = line.slice(5).trim();
      }
    }

    if (!data) return null;

    try {
      return { event, data: JSON.parse(data) };
    } catch {
      return { event, data: { raw: data } };
    }
  };

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(async (userMessage) => {
    if (!userMessage.trim() || isStreaming) return;

    setIsStreaming(true);
    setError(null);
    setStatus(null);

    // Add user message
    addMessage({ role: 'user', content: userMessage });

    // Add empty assistant message for streaming
    addMessage({ role: 'assistant', content: '', isStreaming: true });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Get auth token
      let headers = { 'Content-Type': 'application/json' };
      const user = auth.currentUser;
      if (user) {
        try {
          const idToken = await user.getIdToken();
          headers['Authorization'] = `Bearer ${idToken}`;
        } catch (tokenError) {
          console.warn('Failed to get ID token:', tokenError.message);
        }
      }

      const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete events (separated by double newlines)
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer

        for (const eventText of events) {
          if (!eventText.trim()) continue;

          const parsed = parseSSEEvent(eventText);
          if (!parsed) continue;

          const { event, data } = parsed;

          switch (event) {
            case 'session':
              // Session info received
              if (data.sessionId) {
                setSessionId(data.sessionId);
              }
              break;

            case 'status':
              // Status update with type (thinking, searching, processing, etc.)
              setStatus({
                message: data.message || (typeof data === 'string' ? data : 'Processing...'),
                type: data.type || 'processing'
              });
              break;

            case 'content':
              // Text content chunk - typewriter effect
              if (data.content) {
                updateLastAssistantMessage(data.content);
              }
              break;

            case 'tool_start':
              // Tool execution started
              setStatus({
                message: `🔍 Searching for contacts at ${data.arguments?.company || '...'}...`,
                type: 'searching'
              });
              break;

            case 'tool_result':
              // Tool execution completed
              if (data.success) {
                setStatus({
                  message: `✅ Found ${data.resultCount || 0} contacts`,
                  type: 'success'
                });
                // Store tool result in message metadata
                setMessages((prev) => {
                  const lastIndex = prev.length - 1;
                  if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                    const updated = [...prev];
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      toolResult: data,
                    };
                    return updated;
                  }
                  return prev;
                });
              } else {
                setStatus({
                  message: `❌ Search failed: ${data.error || 'Unknown error'}`,
                  type: 'error'
                });
              }
              // Clear status after a delay
              setTimeout(() => setStatus(null), 3000);
              break;

            case 'error':
              // Error occurred
              setError(data.error || 'An error occurred');
              // Mark the assistant message as having an error
              setMessages((prev) => {
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                  const updated = [...prev];
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    hasError: true,
                    content: updated[lastIndex].content || data.error || 'An error occurred',
                  };
                  return updated;
                }
                return prev;
              });
              break;

            case 'done':
              // Stream completed
              setMessages((prev) => {
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                  const updated = [...prev];
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    isStreaming: false,
                  };
                  return updated;
                }
                return prev;
              });
              break;

            default:
              // Unknown event, might be data-only
              if (data.content) {
                updateLastAssistantMessage(data.content);
              }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Stream error:', err);
        setError(err.message || 'Failed to connect to server');
        // Update the assistant message to show error
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
            const updated = [...prev];
            updated[lastIndex] = {
              ...updated[lastIndex],
              isStreaming: false,
              hasError: true,
              content: updated[lastIndex].content || 'Failed to get response. Please try again.',
            };
            return updated;
          }
          return prev;
        });
      }
    } finally {
      setIsStreaming(false);
      setStatus(null);
      abortControllerRef.current = null;
    }
  }, [isStreaming, sessionId, addMessage, updateLastAssistantMessage]);

  /**
   * Cancel the current stream
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Clear all messages and start fresh
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setStatus(null);
  }, []);

  /**
   * Load messages from a specific session
   */
  const loadSession = useCallback(async (targetSessionId) => {
    try {
      let headers = { 'Content-Type': 'application/json' };
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(`${BACKEND_URL}/api/chat/sessions/${targetSessionId}/messages`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      if (data.success && data.messages) {
        setMessages(data.messages.map((m, i) => ({
          ...m,
          id: `loaded-${i}-${Date.now()}`,
        })));
        setSessionId(targetSessionId);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load chat history');
    }
  }, []);

  return {
    messages,
    isStreaming,
    sessionId,
    status,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
    loadSession,
    setMessages,
  };
}

export default useChatStream;

