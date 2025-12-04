/**
 * Chat Controller
 * Handles chatbot requests via OpenAI
 */

const { chatCompletion, validateConfig } = require('../services/openai.service');

/**
 * POST /api/chat/message
 * Body: { message: string, systemPrompt?: string, model?: string }
 * Returns: { success: boolean, reply?: string, error?: string }
 */
const postMessage = async (req, res) => {
  try {
    const { message, systemPrompt, model } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Validate OpenAI configuration
    try {
      validateConfig();
    } catch (cfgErr) {
      return res.status(500).json({ success: false, error: cfgErr.message });
    }

    const defaultSystem = 'You are a helpful outreach assistant. Answer concisely and professionally.';
    const sys = systemPrompt && typeof systemPrompt === 'string' ? systemPrompt : defaultSystem;
    const mdl = typeof model === 'string' ? model : 'gpt-4o-mini';

    const result = await chatCompletion(sys, message, mdl);

    if (result.success) {
      return res.json({ success: true, reply: result.data });
    }

    return res.status(500).json({ success: false, error: result.error || 'OpenAI chat failed' });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

module.exports = {
  postMessage,
};
