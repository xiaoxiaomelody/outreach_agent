/**
 * Resume Analysis Controller
 * API endpoints for RAG-based resume analysis
 * Phase 4: Workflow integration with doc_id support
 */

const { resumeAnalyzerService } = require('../services/resume-analyzer.service');
const { vectorStoreService } = require('../services/vectorstore.service');

/**
 * Custom error for document not found
 */
class DocumentNotFoundError extends Error {
  constructor(docId) {
    super(`Document not found: ${docId}`);
    this.name = 'DocumentNotFoundError';
    this.docId = docId;
    this.statusCode = 404;
  }
}

/**
 * Analyze resume with optional job description
 * POST /api/resume/analyze
 * POST /api/resume/analyze/:docId
 * 
 * Request body:
 * {
 *   "query": "Provide a comprehensive analysis", // optional
 *   "jobDescription": "We are looking for...",   // optional  
 *   "job_description": "...",                    // alias
 *   "topK": 5                                     // optional
 * }
 * 
 * Response:
 * {
 *   "status": "success",
 *   "doc_id": "resume_user123",
 *   "analysis": { ... ResumeProfile ... }
 * }
 */
const analyzeResume = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const docIdParam = req.params.docId;
    const { query, jobDescription, job_description, topK } = req.body;

    // Support both camelCase and snake_case
    const jobDesc = jobDescription || job_description;
    
    // Determine doc_id: from URL param, body, or derive from userId
    const docId = docIdParam || req.body.doc_id || (userId ? `resume_${userId}` : null);

    console.log(`📊 [API] Resume analysis requested`);
    console.log(`   User: ${userId}, DocID: ${docId}`);

    // Check if document exists (if docId provided)
    if (docId) {
      const exists = await vectorStoreService.documentExists(docId);
      if (!exists) {
        return res.status(404).json({
          status: 'error',
          error: `Document not found: ${docId}`,
          code: 'DOCUMENT_NOT_FOUND',
          suggestion: 'Upload a resume first using POST /api/resume/upload'
        });
      }
    }

    const result = await resumeAnalyzerService.analyzeResume({
      query: query || 'Provide a comprehensive analysis of this candidate',
      jobDescription: jobDesc,
      userId,
      docId,
      topK: topK || 5
    });

    if (!result.success) {
      const statusCode = result.error?.includes('No resume') ? 404 : 500;
      return res.status(statusCode).json({
        status: 'error',
        error: result.error,
        code: statusCode === 404 ? 'DOCUMENT_NOT_FOUND' : 'ANALYSIS_FAILED'
      });
    }

    res.json({
      status: 'success',
      doc_id: docId,
      analysis: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('❌ [API] Resume analysis error:', error.message);
    
    if (error instanceof DocumentNotFoundError) {
      return res.status(404).json({
        status: 'error',
        error: error.message,
        code: 'DOCUMENT_NOT_FOUND'
      });
    }
    
    res.status(500).json({
      status: 'error',
      error: 'Failed to analyze resume',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Analyze skill match against required skills
 * POST /api/resume/skills-match
 * 
 * Request body:
 * {
 *   "requiredSkills": ["Python", "AWS", "React"]
 * }
 */
const analyzeSkillMatch = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { requiredSkills } = req.body;

    if (!requiredSkills || !Array.isArray(requiredSkills) || requiredSkills.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'requiredSkills array is required'
      });
    }

    console.log(`🎯 [API] Skill match analysis for ${requiredSkills.length} skills`);

    const result = await resumeAnalyzerService.analyzeSkillMatch(requiredSkills, {
      filter: userId ? { userId: { $eq: userId } } : {}
    });

    res.json({
      success: true,
      skillAnalysis: result.data
    });

  } catch (error) {
    console.error('Skill match error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze skills'
    });
  }
};

/**
 * Job fit analysis endpoint
 * POST /api/resume/job-fit
 * 
 * Request body:
 * {
 *   "jobTitle": "Senior Software Engineer",
 *   "jobDescription": "We are looking for...",
 *   "requiredSkills": ["Python", "AWS"],
 *   "preferredSkills": ["Kubernetes", "Go"]
 * }
 */
const analyzeJobFit = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { jobTitle, jobDescription, requiredSkills, preferredSkills } = req.body;

    if (!jobDescription) {
      return res.status(400).json({
        success: false,
        error: 'jobDescription is required'
      });
    }

    console.log(`💼 [API] Job fit analysis for: ${jobTitle || 'Unnamed position'}`);

    // Build comprehensive job context
    let fullJobDescription = jobDescription;
    if (jobTitle) {
      fullJobDescription = `Position: ${jobTitle}\n\n${jobDescription}`;
    }
    if (requiredSkills?.length) {
      fullJobDescription += `\n\nRequired Skills: ${requiredSkills.join(', ')}`;
    }
    if (preferredSkills?.length) {
      fullJobDescription += `\n\nPreferred Skills: ${preferredSkills.join(', ')}`;
    }

    const result = await resumeAnalyzerService.analyzeResume({
      query: `Evaluate this candidate's fit for the following position. Provide a detailed job_fit_analysis.`,
      jobDescription: fullJobDescription,
      userId,
      topK: 8  // More context for job fit analysis
    });

    if (!result.success) {
      return res.status(result.error?.includes('No resume') ? 404 : 500).json(result);
    }

    res.json({
      success: true,
      jobTitle: jobTitle || 'Unspecified',
      candidateName: result.data.candidate_name,
      fitAnalysis: result.data.job_fit_analysis || {
        fit_score: null,
        matching_skills: [],
        missing_skills: [],
        recommendation: 'Unable to generate fit analysis'
      },
      fullAnalysis: result.data,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('Job fit analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze job fit'
    });
  }
};

/**
 * Get red flags analysis only
 * GET /api/resume/red-flags
 */
const getRedFlags = async (req, res) => {
  try {
    const userId = req.user?.uid;

    console.log(`🚩 [API] Red flags analysis requested`);

    const result = await resumeAnalyzerService.analyzeResume({
      query: `Identify all potential red flags, concerns, and areas that need clarification in this resume. Be thorough and cite specific evidence.`,
      userId,
      topK: 10
    });

    if (!result.success) {
      return res.status(result.error?.includes('No resume') ? 404 : 500).json(result);
    }

    res.json({
      success: true,
      candidateName: result.data.candidate_name,
      redFlags: result.data.red_flags || [],
      strengths: result.data.strengths || [],
      sources: result.data.sources
    });

  } catch (error) {
    console.error('Red flags analysis error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze red flags'
    });
  }
};

/**
 * Custom query analysis
 * POST /api/resume/query
 * 
 * Request body:
 * {
 *   "query": "Does this candidate have leadership experience?"
 * }
 */
const queryResume = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }

    console.log(`❓ [API] Custom query: "${query.substring(0, 50)}..."`);

    const result = await resumeAnalyzerService.analyzeResume({
      query,
      userId,
      topK: 5
    });

    res.json({
      success: result.success,
      query,
      analysis: result.data,
      error: result.error
    });

  } catch (error) {
    console.error('Query error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process query'
    });
  }
};

module.exports = {
  analyzeResume,
  analyzeSkillMatch,
  analyzeJobFit,
  getRedFlags,
  queryResume
};

