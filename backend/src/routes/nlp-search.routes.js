/**
 * NLP Search Routes
 * Natural language contact search endpoints
 */

const express = require('express');
const router = express.Router();
const nlpSearchController = require('../controllers/nlp-search.controller');

/**
 * POST /api/search/nlp
 * Process natural language search query
 * Body: { query: string }
 */
router.post('/nlp', nlpSearchController.nlpSearch);

/**
 * POST /api/search/suggest
 * Get search suggestions
 * Body: { partial: string }
 */
router.post('/suggest', nlpSearchController.getSuggestions);

module.exports = router;
