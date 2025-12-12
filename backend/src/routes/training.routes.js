/**
 * Training routes - endpoints for saving local training interactions
 */
const express = require('express');
const router = express.Router();
const trainingController = require('../controllers/training.controller');

/**
 * POST /api/training/save
 * Body: { contact, action, query?, metadata? }
 */
router.post('/save', trainingController.saveInteraction);
// Run training now and return trained weights
router.post('/run', trainingController.runTraining);

module.exports = router;
