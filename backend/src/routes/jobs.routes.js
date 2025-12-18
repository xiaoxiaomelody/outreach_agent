/**
 * Jobs Routes
 * API endpoints for job listings
 */

const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');

// GET /api/jobs - Get jobs (optionally filtered by category)
router.get('/', jobsController.getJobs);

// GET /api/jobs/categories - Get all available categories
router.get('/categories', jobsController.getCategories);

// GET /api/jobs/stats - Get job statistics
router.get('/stats', jobsController.getStats);

// GET /api/jobs/company-contacts - Get contacts from a company via Hunter.io
router.get('/company-contacts', jobsController.getCompanyContacts);

// POST /api/jobs/refresh - Manually refresh job listings
router.post('/refresh', jobsController.refreshJobs);

module.exports = router;

