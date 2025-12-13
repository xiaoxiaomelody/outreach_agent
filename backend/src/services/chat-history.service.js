/**
 * Chat History Service
 * Manages chat session persistence in Firestore
 * 
 * Schema:
 * - chatSessions/{sessionId}
 *   - userId: string
 *   - title: string
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 *   - messageCount: number
 *   - status: 'active' | 'archived'
 * 
 * - chatSessions/{sessionId}/messages/{messageId}
 *   - role: 'user' | 'assistant' | 'tool' | 'system'
 *   - content: string | null
 *   - toolCalls?: array (for assistant messages with tool calls)
 *   - toolCallId?: string (for tool result messages)
 *   - toolName?: string (for tool result messages)
 *   - timestamp: timestamp
 *   - tokenEstimate?: number
 */

const { getFirestore } = require('../config/firebase');

// Constants for context window management
const MAX_CONTEXT_MESSAGES = 20;  // Maximum messages to load for context
const MAX_TOOL_RESULT_LENGTH = 500;  // Max chars for stored tool results
const TOKEN_ESTIMATE_PER_CHAR = 0.25;  // Rough estimate: 4 chars ≈ 1 token

/**
 * Create a new chat session
 * @param {string} userId - User ID from Firebase Auth
 * @param {string} [title] - Optional session title
 * @returns {Promise<Object>} Created session with ID
 */
const createSession = async (userId, title = null) => {
  const db = getFirestore();
  
  if (!db) {
    console.warn('⚠️ [ChatHistory] Firestore not available (DEV_MODE?)');
    return {
      success: true,
      sessionId: `dev-session-${Date.now()}`,
      devMode: true
    };
  }

  if (!userId) {
    return { success: false, error: 'userId is required' };
  }

  try {
    const sessionData = {
      userId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      status: 'active'
    };

    const docRef = await db.collection('chatSessions').add(sessionData);
    
    console.log(`✅ [ChatHistory] Created session ${docRef.id} for user ${userId}`);

    return {
      success: true,
      sessionId: docRef.id,
      ...sessionData
    };
  } catch (error) {
    console.error('❌ [ChatHistory] createSession error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get or create a session for a user
 * If no active session exists, creates a new one
 * @param {string} userId - User ID
 * @param {string} [sessionId] - Optional existing session ID
 * @returns {Promise<Object>} Session info
 */
const getOrCreateSession = async (userId, sessionId = null) => {
  const db = getFirestore();
  
  if (!db) {
    return {
      success: true,
      sessionId: sessionId || `dev-session-${Date.now()}`,
      devMode: true
    };
  }

  // If sessionId provided, verify it belongs to user
  if (sessionId) {
    try {
      const sessionDoc = await db.collection('chatSessions').doc(sessionId).get();
      
      if (sessionDoc.exists && sessionDoc.data().userId === userId) {
        return {
          success: true,
          sessionId,
          ...sessionDoc.data()
        };
      }
    } catch (error) {
      console.warn(`⚠️ [ChatHistory] Session ${sessionId} not found, creating new`);
    }
  }

  // Create new session
  return createSession(userId);
};

/**
 * Save a message to a chat session
 * @param {string} sessionId - Session ID
 * @param {Object} message - Message object
 * @param {string} message.role - 'user' | 'assistant' | 'tool' | 'system'
 * @param {string|null} message.content - Message content
 * @param {Array} [message.toolCalls] - Tool calls (for assistant)
 * @param {string} [message.toolCallId] - Tool call ID (for tool results)
 * @param {string} [message.toolName] - Tool name (for tool results)
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>} Save result
 */
const saveMessage = async (sessionId, message, userId) => {
  const db = getFirestore();
  
  if (!db) {
    console.log(`📝 [ChatHistory] DEV_MODE: Would save message to ${sessionId}:`, message.role);
    return { success: true, devMode: true };
  }

  if (!sessionId || !message || !userId) {
    return { success: false, error: 'sessionId, message, and userId are required' };
  }

  try {
    // Verify session belongs to user
    const sessionRef = db.collection('chatSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      return { success: false, error: 'Session not found' };
    }
    
    if (sessionDoc.data().userId !== userId) {
      return { success: false, error: 'Unauthorized access to session' };
    }

    // Prepare message for storage
    const messageData = prepareMessageForStorage(message);
    messageData.timestamp = new Date();
    messageData.tokenEstimate = estimateTokens(messageData);

    // Save message to subcollection
    const messageRef = await sessionRef.collection('messages').add(messageData);

    // Update session metadata
    await sessionRef.update({
      updatedAt: new Date(),
      messageCount: (sessionDoc.data().messageCount || 0) + 1,
      // Update title based on first user message if still default
      ...(message.role === 'user' && sessionDoc.data().title?.startsWith('Chat ') ? {
        title: generateSessionTitle(message.content)
      } : {})
    });

    console.log(`✅ [ChatHistory] Saved ${message.role} message to ${sessionId}`);

    return {
      success: true,
      messageId: messageRef.id,
      tokenEstimate: messageData.tokenEstimate
    };
  } catch (error) {
    console.error('❌ [ChatHistory] saveMessage error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save multiple messages at once (batch operation)
 * @param {string} sessionId - Session ID
 * @param {Array<Object>} messages - Array of messages
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Save result
 */
const saveMessages = async (sessionId, messages, userId) => {
  const db = getFirestore();
  
  if (!db) {
    console.log(`📝 [ChatHistory] DEV_MODE: Would save ${messages.length} messages`);
    return { success: true, devMode: true };
  }

  if (!messages || messages.length === 0) {
    return { success: true, savedCount: 0 };
  }

  try {
    const sessionRef = db.collection('chatSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists || sessionDoc.data().userId !== userId) {
      return { success: false, error: 'Unauthorized or session not found' };
    }

    const batch = db.batch();
    let totalTokens = 0;

    for (const message of messages) {
      const messageData = prepareMessageForStorage(message);
      messageData.timestamp = new Date();
      messageData.tokenEstimate = estimateTokens(messageData);
      totalTokens += messageData.tokenEstimate;

      const messageRef = sessionRef.collection('messages').doc();
      batch.set(messageRef, messageData);
    }

    // Update session metadata
    batch.update(sessionRef, {
      updatedAt: new Date(),
      messageCount: (sessionDoc.data().messageCount || 0) + messages.length
    });

    await batch.commit();

    console.log(`✅ [ChatHistory] Batch saved ${messages.length} messages to ${sessionId}`);

    return {
      success: true,
      savedCount: messages.length,
      totalTokenEstimate: totalTokens
    };
  } catch (error) {
    console.error('❌ [ChatHistory] saveMessages error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get message history for a session (for context window)
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID for authorization
 * @param {Object} [options] - Options
 * @param {number} [options.limit] - Max messages to retrieve
 * @param {number} [options.maxTokens] - Max total tokens
 * @returns {Promise<Object>} Messages array
 */
const getHistory = async (sessionId, userId, options = {}) => {
  const db = getFirestore();
  
  if (!db) {
    console.log(`📖 [ChatHistory] DEV_MODE: No history available`);
    return { success: true, messages: [], devMode: true };
  }

  const { limit = MAX_CONTEXT_MESSAGES, maxTokens = 4000 } = options;

  try {
    // Verify session belongs to user
    const sessionRef = db.collection('chatSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      return { success: false, error: 'Session not found', messages: [] };
    }
    
    if (sessionDoc.data().userId !== userId) {
      return { success: false, error: 'Unauthorized', messages: [] };
    }

    // Get recent messages ordered by timestamp
    const messagesSnapshot = await sessionRef
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    // Convert to array and reverse (oldest first)
    const messages = [];
    let totalTokens = 0;

    // Process in reverse order (newest first in snapshot)
    const docs = messagesSnapshot.docs.reverse();

    for (const doc of docs) {
      const data = doc.data();
      const tokenEstimate = data.tokenEstimate || estimateTokens(data);

      // Check token budget
      if (totalTokens + tokenEstimate > maxTokens && messages.length > 0) {
        console.log(`⚠️ [ChatHistory] Token limit reached, truncating history`);
        break;
      }

      totalTokens += tokenEstimate;
      messages.push(formatMessageForAPI(data));
    }

    console.log(`📖 [ChatHistory] Loaded ${messages.length} messages (${totalTokens} tokens est.)`);

    return {
      success: true,
      messages,
      totalTokenEstimate: totalTokens,
      session: {
        id: sessionId,
        title: sessionDoc.data().title,
        messageCount: sessionDoc.data().messageCount
      }
    };
  } catch (error) {
    console.error('❌ [ChatHistory] getHistory error:', error);
    return { success: false, error: error.message, messages: [] };
  }
};

/**
 * Get all sessions for a user
 * @param {string} userId - User ID
 * @param {Object} [options] - Options
 * @param {number} [options.limit] - Max sessions
 * @param {boolean} [options.includeArchived] - Include archived sessions
 * @returns {Promise<Object>} Sessions array
 */
const getUserSessions = async (userId, options = {}) => {
  const db = getFirestore();
  
  if (!db) {
    return { success: true, sessions: [], devMode: true };
  }

  const { limit = 20, includeArchived = false } = options;

  try {
    let query = db.collection('chatSessions')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(limit);

    if (!includeArchived) {
      query = query.where('status', '==', 'active');
    }

    const snapshot = await query.get();
    
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
    }));

    return { success: true, sessions };
  } catch (error) {
    console.error('❌ [ChatHistory] getUserSessions error:', error);
    return { success: false, error: error.message, sessions: [] };
  }
};

/**
 * Clear/archive a session's history
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {boolean} [hardDelete=false] - Permanently delete vs archive
 * @returns {Promise<Object>} Result
 */
const clearHistory = async (sessionId, userId, hardDelete = false) => {
  const db = getFirestore();
  
  if (!db) {
    return { success: true, devMode: true };
  }

  try {
    const sessionRef = db.collection('chatSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists || sessionDoc.data().userId !== userId) {
      return { success: false, error: 'Unauthorized or session not found' };
    }

    if (hardDelete) {
      // Delete all messages
      const messagesSnapshot = await sessionRef.collection('messages').get();
      const batch = db.batch();
      
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      batch.delete(sessionRef);
      await batch.commit();
      
      console.log(`🗑️ [ChatHistory] Hard deleted session ${sessionId}`);
    } else {
      // Soft delete (archive)
      await sessionRef.update({
        status: 'archived',
        updatedAt: new Date()
      });
      
      console.log(`📦 [ChatHistory] Archived session ${sessionId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ [ChatHistory] clearHistory error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update session title
 * @param {string} sessionId - Session ID
 * @param {string} title - New title
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
const updateSessionTitle = async (sessionId, title, userId) => {
  const db = getFirestore();
  
  if (!db) {
    return { success: true, devMode: true };
  }

  try {
    const sessionRef = db.collection('chatSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists || sessionDoc.data().userId !== userId) {
      return { success: false, error: 'Unauthorized or session not found' };
    }

    await sessionRef.update({
      title,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('❌ [ChatHistory] updateSessionTitle error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Prepare a message for storage
 * Handles context optimization for tool results
 */
function prepareMessageForStorage(message) {
  const stored = {
    role: message.role,
    content: message.content
  };

  // Handle assistant messages with tool calls
  if (message.role === 'assistant' && message.tool_calls) {
    stored.toolCalls = message.tool_calls.map(tc => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments
      }
    }));
    stored.content = message.content || null;
  }

  // Handle tool result messages - CONTEXT OPTIMIZATION
  if (message.role === 'tool') {
    stored.toolCallId = message.tool_call_id;
    stored.toolName = message.toolName || 'unknown';
    
    // Summarize large tool results for storage
    stored.content = summarizeToolResult(message.content, message.toolName);
    stored.originalLength = message.content?.length || 0;
    stored.wasSummarized = stored.content !== message.content;
  }

  return stored;
}

/**
 * CONTEXT OPTIMIZATION: Summarize tool results for storage
 * Full JSON is used for immediate API response, but stored history
 * only needs a summary to prevent token explosion
 */
function summarizeToolResult(content, toolName) {
  if (!content) return content;
  
  // If content is already short enough, keep it
  if (content.length <= MAX_TOOL_RESULT_LENGTH) {
    return content;
  }

  try {
    const parsed = JSON.parse(content);
    
    // Handle Contacts tool result
    if (parsed.contacts || parsed.resultCount !== undefined) {
      const count = parsed.resultCount || parsed.contacts?.length || 0;
      const company = parsed.searchParams?.company || parsed.metadata?.organization || 'unknown';
      const success = parsed.success !== false;
      
      if (!success) {
        return JSON.stringify({
          success: false,
          error: parsed.error || 'Search failed',
          summary: `Search failed: ${parsed.error || 'unknown error'}`
        });
      }

      // Create summary with key info
      const topContacts = (parsed.contacts || []).slice(0, 3).map(c => ({
        name: c.name,
        position: c.position,
        email: c.email
      }));

      return JSON.stringify({
        success: true,
        summary: `Found ${count} contacts at ${company}`,
        resultCount: count,
        company,
        topContacts,
        note: 'Full results were provided in the conversation'
      });
    }

    // Generic summarization for other tool results
    return JSON.stringify({
      summary: `Tool result with ${Object.keys(parsed).length} fields`,
      success: parsed.success !== false,
      truncated: true
    });

  } catch (e) {
    // Not JSON, truncate text
    return content.substring(0, MAX_TOOL_RESULT_LENGTH) + '... [truncated]';
  }
}

/**
 * Format a stored message for OpenAI API
 */
function formatMessageForAPI(storedMessage) {
  const message = {
    role: storedMessage.role,
    content: storedMessage.content
  };

  // Restore tool calls for assistant messages
  if (storedMessage.role === 'assistant' && storedMessage.toolCalls) {
    message.tool_calls = storedMessage.toolCalls;
    message.content = storedMessage.content || null;
  }

  // Restore tool result format
  if (storedMessage.role === 'tool') {
    message.tool_call_id = storedMessage.toolCallId;
  }

  return message;
}

/**
 * Estimate token count for a message
 */
function estimateTokens(message) {
  let charCount = 0;
  
  if (message.content) {
    charCount += message.content.length;
  }
  
  if (message.toolCalls) {
    charCount += JSON.stringify(message.toolCalls).length;
  }
  
  return Math.ceil(charCount * TOKEN_ESTIMATE_PER_CHAR);
}

/**
 * Generate a title from the first user message
 */
function generateSessionTitle(content) {
  if (!content) return 'New Chat';
  
  // Take first 50 chars, clean up
  let title = content.substring(0, 50).trim();
  
  // Remove incomplete words at the end
  const lastSpace = title.lastIndexOf(' ');
  if (lastSpace > 20 && title.length === 50) {
    title = title.substring(0, lastSpace);
  }
  
  // Add ellipsis if truncated
  if (content.length > 50) {
    title += '...';
  }
  
  return title;
}

module.exports = {
  createSession,
  getOrCreateSession,
  saveMessage,
  saveMessages,
  getHistory,
  getUserSessions,
  clearHistory,
  updateSessionTitle,
  // Export constants for testing
  MAX_CONTEXT_MESSAGES,
  MAX_TOOL_RESULT_LENGTH
};


