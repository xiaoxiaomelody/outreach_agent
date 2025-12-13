/**
 * Profile Controller
 * Handles user profile operations including resume upload
 * Phase 4: Complete workflow integration with proper error handling
 */

const multer = require('multer');
const resumeService = require('../services/resume.service');
const { InvalidDocumentError } = require('../validators/resume.validator');

// Configure multer for memory storage (no disk writes)
const storage = multer.memoryStorage();

// File filter - only accept PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Middleware for single file upload
const uploadMiddleware = upload.single('resume');

/**
 * Handle resume file upload
 * POST /api/resume/upload
 * 
 * Complete workflow: PDF Upload -> Validate -> Parse -> Index -> Store
 * 
 * @param {Object} req - Express request (with file from multer)
 * @param {Object} res - Express response
 * 
 * Success Response:
 * {
 *   "status": "success",
 *   "doc_id": "resume_user123",
 *   "data": { ... parsed resume ... },
 *   "metadata": { ... }
 * }
 * 
 * Error Responses:
 * - 400: Invalid document (failed validation)
 * - 415: Unsupported media type (not PDF)
 * - 422: Unprocessable (extraction/parsing failed)
 * - 500: Server error
 */
const uploadResume = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        error: 'No file uploaded. Please upload a PDF resume.',
        code: 'NO_FILE'
      });
    }

    // Get user ID from authenticated request
    const userId = req.user.uid;
    const docId = `resume_${userId}`;
    
    console.log(`📄 [Upload] Resume upload received for user: ${userId}`);
    console.log(`   File: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    // Execute complete workflow: Parse -> Validate -> Index -> Store
    const result = await resumeService.parseAndSaveResume(userId, req.file.buffer);

    if (!result.success) {
      // Map error step to appropriate HTTP status code
      const errorMapping = {
        'extraction': { status: 422, code: 'EXTRACTION_FAILED' },
        'validation': { status: 400, code: 'INVALID_DOCUMENT' },
        'parsing': { status: 422, code: 'PARSING_FAILED' },
        'saving': { status: 500, code: 'STORAGE_FAILED' },
        'indexing': { status: 500, code: 'INDEXING_FAILED' }
      };
      
      const errorInfo = errorMapping[result.step] || { status: 500, code: 'UNKNOWN_ERROR' };
      
      return res.status(errorInfo.status).json({
        status: 'error',
        error: result.error,
        code: errorInfo.code,
        step: result.step,
        details: result.details || null
      });
    }

    // Success response with doc_id for subsequent analysis
    res.json({
      status: 'success',
      doc_id: docId,
      message: 'Resume uploaded, validated, and indexed successfully',
      data: {
        fullName: result.data.fullName,
        currentRole: result.data.currentRole,
        yearsOfExperience: result.data.yearsOfExperience,
        skillCount: result.data.skills?.length || 0,
        experienceCount: result.data.experiences?.length || 0
      },
      metadata: {
        ...result.metadata,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Upload] Resume upload error:', error.message);
    
    // Handle InvalidDocumentError (from Phase 1 validation)
    if (error instanceof InvalidDocumentError) {
      return res.status(400).json({
        status: 'error',
        error: error.message,
        code: 'INVALID_DOCUMENT',
        details: error.details
      });
    }
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          status: 'error',
          error: 'File too large. Maximum size is 10MB.',
          code: 'FILE_TOO_LARGE'
        });
      }
      return res.status(400).json({
        status: 'error',
        error: `Upload error: ${error.message}`,
        code: 'UPLOAD_ERROR'
      });
    }

    // Handle file filter errors
    if (error.message === 'Only PDF files are allowed') {
      return res.status(415).json({
        status: 'error',
        error: error.message,
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }

    // Generic error
    res.status(500).json({
      status: 'error',
      error: 'Failed to process resume upload',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Wrapper function that includes multer middleware
 * Use this for route registration
 */
const handleResumeUpload = (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      // Handle multer errors here
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 10MB.'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`
        });
      }
      
      // Handle file filter errors
      if (err.message === 'Only PDF files are allowed') {
        return res.status(415).json({
          success: false,
          error: err.message
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Upload processing failed'
      });
    }
    
    // Proceed to uploadResume handler
    uploadResume(req, res);
  });
};

module.exports = {
  uploadResume,
  handleResumeUpload,
  uploadMiddleware
};

