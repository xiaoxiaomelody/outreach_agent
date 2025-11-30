/**
 * Email Routes
 * Email drafting and sending endpoints
 */

const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');

/**
 * POST /api/emails/draft
 * Generate personalized email draft
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

