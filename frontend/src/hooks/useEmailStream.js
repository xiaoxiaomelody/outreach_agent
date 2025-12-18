/**
 * useEmailStream Hook
 * 
 * Manages SSE streaming for AI-powered email draft generation
 * Consumes POST /api/emails/stream-draft endpoint
 */

import { useState, useCallback, useRef } from 'react';
import { auth } from '../config/firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

/**
 * Custom hook for streaming AI email generation
 * 
 * @returns {Object} Hook state and methods
 */
export function useEmailStream() {
  // State
  const [draftContent, setDraftContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null); // { message: string, type: string }
  const [metadata, setMetadata] = useState(null);
  
  // Refs for cleanup
  const abortControllerRef = useRef(null);
  const readerRef = useRef(null);

  /**
   * Cancel the current stream
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      try {
        readerRef.current.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
      readerRef.current = null;
    }
    setIsStreaming(false);
    setStatus(null);
  }, []);

  /**
   * Reset state for new generation
   */
  const resetState = useCallback(() => {
    setDraftContent('');
    setError(null);
    setStatus(null);
    setMetadata(null);
  }, []);

  /**
   * Generate email draft using AI
   * 
   * @param {Object} options - Generation options
   * @param {Object} options.recipientInfo - Recipient information
   * @param {string} options.recipientInfo.companyName - Target company (required)
   * @param {string} options.recipientInfo.jobTitle - Target position (required)
   * @param {string} [options.recipientInfo.recipientName] - Recipient's name
   * @param {string} [options.recipientInfo.recipientRole] - Recipient's role
   * @param {string} [options.tone='Formal'] - Email tone
   * @param {string} [options.template] - Custom template
   * @param {string} [options.jobDescription] - Job description for context
   * @param {boolean} [options.append=false] - Append to existing content instead of overwrite
   * @returns {Promise<string>} Full generated content
   */
  const generateDraft = useCallback(async (options) => {
    const {
      recipientInfo,
      tone = 'Formal',
      template,
      jobDescription,
      append = false
    } = options;

    // Validate required fields
    if (!recipientInfo?.companyName) {
      const err = 'Company name is required';
      setError(err);
      throw new Error(err);
    }
    if (!recipientInfo?.jobTitle) {
      const err = 'Job title is required';
      setError(err);
      throw new Error(err);
    }

    // Cancel any existing stream
    cancelStream();

    // Reset or preserve state based on append mode
    if (!append) {
      resetState();
    } else {
      setError(null);
      setStatus(null);
    }

    setIsStreaming(true);
    setStatus({ message: 'Connecting...', type: 'connecting' });

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Get auth token
      const user = auth.currentUser;
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };

      if (user) {
        try {
          const idToken = await user.getIdToken();
          headers['Authorization'] = `Bearer ${idToken}`;
        } catch (tokenError) {
          console.warn('Failed to get ID token:', tokenError.message);
        }
      }

      // Build request body
      const requestBody = {
        recipient_info: {
          company_name: recipientInfo.companyName,
          job_title: recipientInfo.jobTitle,
          recipient_name: recipientInfo.recipientName,
          recipient_role: recipientInfo.recipientRole
        },
        tone
      };

      if (template) {
        requestBody.template = template;
      }
      if (jobDescription) {
        requestBody.job_description = jobDescription;
      }

      // Make request
      const response = await fetch(`${BACKEND_URL}/api/emails/stream-draft`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Ignore JSON parse error
        }
        throw new Error(errorMessage);
      }

      // Read the stream
      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = append ? draftContent : '';

      setStatus({ message: 'Generating...', type: 'generating' });

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete events (separated by double newlines)
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventText of events) {
          const trimmed = eventText.trim();
          
          if (!trimmed || trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              switch (data.type) {
                case 'start':
                  setStatus({ message: data.message || 'Starting...', type: 'starting' });
                  break;

                case 'content':
                  // Append content chunk - typewriter effect
                  if (data.content) {
                    fullContent += data.content;
                    setDraftContent(fullContent);
                  }
                  break;

                case 'finish':
                  setStatus({ message: 'Finishing...', type: 'finishing' });
                  break;

                case 'complete':
                  setMetadata(data.metadata || null);
                  if (data.fullContent && !append) {
                    // Use server's full content if available (more reliable)
                    fullContent = data.fullContent;
                    setDraftContent(fullContent);
                  }
                  break;

                case 'error':
                  throw new Error(data.error || 'Generation failed');

                default:
                  // Unknown event type
                  break;
              }
            } catch (parseError) {
              if (parseError.message && !parseError.message.includes('JSON')) {
                throw parseError;
              }
              // Ignore JSON parse errors for malformed events
            }
          }
        }
      }

      setStatus({ message: 'Complete!', type: 'complete' });
      
      // Clear status after delay
      setTimeout(() => setStatus(null), 2000);

      return fullContent;

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Email stream aborted by user');
        setStatus({ message: 'Cancelled', type: 'cancelled' });
      } else {
        console.error('Email stream error:', err);
        setError(err.message || 'Failed to generate email');
        setStatus({ message: 'Error', type: 'error' });
      }
      throw err;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      readerRef.current = null;
    }
  }, [draftContent, cancelStream, resetState]);

  /**
   * Clear draft content
   */
  const clearDraft = useCallback(() => {
    setDraftContent('');
    setError(null);
    setStatus(null);
    setMetadata(null);
  }, []);

  /**
   * Set draft content manually
   */
  const setContent = useCallback((content) => {
    setDraftContent(content);
  }, []);

  return {
    // State
    draftContent,
    isStreaming,
    error,
    status,
    metadata,
    
    // Methods
    generateDraft,
    cancelStream,
    clearDraft,
    setContent,
    resetState
  };
}

export default useEmailStream;





