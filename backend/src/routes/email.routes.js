/**
 * Email Routes
 * Email drafting, AI generation, and sending endpoints
 * 
 * Includes SSE streaming endpoint for AI-powered email generation
 */

const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');

// ============================================
// AI EMAIL GENERATION (SSE Streaming)
// ============================================

/**
 * POST /api/emails/stream-draft
 * 
 * Stream AI-generated email draft using Server-Sent Events (SSE)
 * 
 * Prerequisites:
 * - User must be authenticated
 * - User must have uploaded and parsed a resume
 * 
 * Request Body:
 * {
 *   recipient_info: {
 *     company_name: string (required),
 *     job_title: string (required),
 *     recipient_name?: string,
 *     recipient_role?: string
 *   },
 *   tone: 'Formal' | 'Casual' | 'Confident' | 'Curious' (default: 'Formal'),
 *   template?: string,
 *   job_description?: string (triggers RAG for relevant resume chunks)
 * }
 * 
 * Response Headers:
 *   Content-Type: text/event-stream
 * 
 * SSE Events:
 *   - { type: 'start', message: '...' }
 *   - { type: 'content', content: '...' } (streamed chunks)
 *   - { type: 'finish', finishReason: '...' }
 *   - { type: 'complete', fullContent: '...', metadata: {...} }
 *   - { type: 'error', error: '...' }
 *   - [DONE]
 * 
 * Error Codes:
 *   - 400: NO_RESUME_PROFILE, MISSING_RECIPIENT_INFO, MISSING_COMPANY_NAME, MISSING_JOB_TITLE, INVALID_TONE
 *   - 401: UNAUTHORIZED
 *   - 500: INTERNAL_ERROR
 */
router.post('/stream-draft', emailController.streamDraft);

// ============================================
// LEGACY EMAIL ENDPOINTS
// ============================================

/**
 * POST /api/emails/draft
 * Generate personalized email draft (non-streaming)
 * Body: { recipientName, recipientEmail, recipientPosition, recipientCompany, recipientSummary, template, senderName }
 */
router.post('/draft', emailController.draftEmail);

/**
 * POST /api/emails/send
 * Send a single email via Gmail
 * Body: { to, subject, body, fromName? }
 */
router.post('/send', emailController.sendEmail);

/**
 * POST /api/emails/batch-send
 * Send multiple emails via Gmail
 * Body: { emails: Array<{ to, subject, body, fromName? }> }
 */
router.post('/batch-send', emailController.batchSendEmails);

module.exports = router;

