/**
 * Chat Routes
 * Supports streaming, non-streaming, and session management endpoints
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// ============================================
// CHAT ENDPOINTS
// ============================================

/**
 * POST /api/chat/message
 * Non-streaming chat endpoint (legacy)
 * Body: { message: string, systemPrompt?: string, model?: string }
 * Response: { success: boolean, reply?: string, error?: string }
 */
router.post('/message', chatController.postMessage);

/**
 * POST /api/chat/stream
 * SSE streaming chat endpoint with Function Calling and Persistence
 * Body: {
 *   message: string,              // Current user message
 *   sessionId?: string,           // Existing session ID (optional, creates new if not provided)
 *   systemPrompt?: string,
 *   model?: string
 * }
 * 
 * SSE Events:
 * - event: session - Session info { sessionId, title, isNew }
 * - event: status - Status updates
 * - event: content - Text content chunks from AI
 * - event: tool_start - Tool execution started
 * - event: tool_result - Tool execution result  
 * - event: error - Error occurred
 * - event: done - Stream complete { sessionId, totalContent }
 */
router.post('/stream', chatController.streamChat);

// ============================================
// SESSION MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/chat/sessions
 * Create a new chat session
 * Body: { title?: string }
 * Response: { success, sessionId, title, createdAt }
 */
router.post('/sessions', chatController.createNewSession);

/**
 * GET /api/chat/sessions
 * Get all sessions for current user
 * Query: { limit?: number, includeArchived?: boolean }
 * Response: { success, sessions: Array<Session> }
 */
router.get('/sessions', chatController.getSessions);

/**
 * GET /api/chat/sessions/:sessionId/messages
 * Get messages for a specific session
 * Query: { limit?: number }
 * Response: { success, messages: Array<Message>, session: SessionInfo }
 */
router.get('/sessions/:sessionId/messages', chatController.getSessionMessages);

/**
 * PUT /api/chat/sessions/:sessionId
 * Update session metadata (title)
 * Body: { title: string }
 * Response: { success }
 */
router.put('/sessions/:sessionId', chatController.updateSession);

/**
 * DELETE /api/chat/sessions/:sessionId
 * Delete or archive a session
 * Query: { hard?: boolean } - true for permanent delete, false (default) for archive
 * Response: { success }
 */
router.delete('/sessions/:sessionId', chatController.deleteSession);

module.exports = router;
