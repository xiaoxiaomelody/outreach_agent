/**
 * Chat Routes
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// POST /api/chat/message - send user message to OpenAI and get reply
router.post('/message', chatController.postMessage);

module.exports = router;
