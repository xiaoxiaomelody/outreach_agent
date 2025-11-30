/**
 * Authentication Routes
 * Gmail OAuth and authentication endpoints
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * GET /api/auth/gmail/connect
 * Get Gmail OAuth URL to start authorization
 * Protected route - user must be authenticated
 */
router.get('/gmail/connect', authController.initiateGmailOAuth);

/**
 * GET /api/auth/gmail/status
 * Check if user has Gmail connected
 * Protected route
 */
router.get('/gmail/status', authController.getGmailStatus);

/**
 * POST /api/auth/gmail/disconnect
 * Disconnect Gmail for current user
 * Protected route
 */
router.post('/gmail/disconnect', authController.disconnectGmail);

module.exports = router;

