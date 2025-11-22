/**
 * Contact Routes
 * API endpoints for contact search and management
 */

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');

// Note: All routes require authentication middleware to be applied at the app level
// Authentication is applied in index.js: app.use('/api/contacts', authenticateUser, contactRoutes);

/**
 * POST /api/contacts/company
 * Find contacts at a specific company with AI summaries
 * Body: { company: string, limit?: number }
 */
router.post('/company', contactController.findCompanyContacts);

/**
 * POST /api/contacts/search-by-department
 * Search contacts by department with AI summaries
 * Body: { company: string, department: string, limit?: number }
 */
router.post('/search-by-department', contactController.searchByDepartment);

/**
 * POST /api/contacts/search-by-seniority
 * Search contacts by seniority level with AI summaries
 * Body: { company: string, seniority: string, limit?: number }
 */
router.post('/search-by-seniority', contactController.searchBySeniority);

/**
 * POST /api/contacts/natural-search
 * Natural language search with AI summaries
 * Body: { query: string }
 */
router.post('/natural-search', contactController.naturalLanguageSearch);

module.exports = router;
