const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/ranking.controller');

// POST /api/ranking/interaction
router.post('/interaction', rankingController.recordInteraction);

module.exports = router;
