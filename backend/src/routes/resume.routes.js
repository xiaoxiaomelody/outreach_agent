/**
 * Resume Routes
 * API endpoints for resume upload, analysis, and RAG queries
 * 
 * Phase 4: Complete workflow API
 * 
 * Workflow:
 * 1. POST /upload -> Returns { doc_id: "resume_xxx" }
 * 2. POST /analyze/:doc_id -> Returns { analysis: {...} }
 */

const express = require('express');
const router = express.Router();

const profileController = require('../controllers/profile.controller');
const analysisController = require('../controllers/resume-analysis.controller');

// ============================================
// UPLOAD ROUTES (Phase 1 + 2)
// ============================================

/**
 * POST /api/resume/upload
 * Upload and parse a PDF resume
 * 
 * Workflow: PDF -> Validate -> Parse -> Index -> Store
 * 
 * Returns: { status: "success", doc_id: "resume_xxx" }
 * Errors:
 *   - 400: Invalid document (validation failed)
 *   - 415: Unsupported media type (not PDF)
 *   - 422: Unprocessable (extraction/parsing failed)
 */
router.post('/upload', profileController.handleResumeUpload);

// ============================================
// ANALYSIS ROUTES (Phase 3)
// ============================================

/**
 * POST /api/resume/analyze
 * POST /api/resume/analyze/:docId
 * 
 * Analyze resume (uses user's resume if docId not provided)
 * 
 * Body: { query?, jobDescription?, job_description?, topK? }
 * Returns: { status: "success", doc_id: "...", analysis: {...} }
 * Errors:
 *   - 404: Document not found
 */
router.post('/analyze', analysisController.analyzeResume);
router.post('/analyze/:docId', analysisController.analyzeResume);

/**
 * POST /api/resume/skills-match
 * Check which required skills the candidate has
 * 
 * Body: { requiredSkills: string[] }
 */
router.post('/skills-match', analysisController.analyzeSkillMatch);

/**
 * POST /api/resume/job-fit
 * Analyze fit for a specific job
 * 
 * Body: { jobTitle?, jobDescription, requiredSkills?, preferredSkills? }
 */
router.post('/job-fit', analysisController.analyzeJobFit);

/**
 * GET /api/resume/red-flags
 * Get potential concerns and red flags
 */
router.get('/red-flags', analysisController.getRedFlags);

/**
 * POST /api/resume/query
 * Custom query against the resume
 * 
 * Body: { query: string }
 */
router.post('/query', analysisController.queryResume);

module.exports = router;

