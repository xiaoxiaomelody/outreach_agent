/**
 * Resume Analyzer Service
 * RAG-based resume analysis engine with structured output
 * The "Brain" of the application - analyzes resumes against queries/job descriptions
 */

const axios = require('axios');
const { vectorStoreService } = require('./vectorstore.service');

// ============================================
// CONSTANTS
// ============================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Retriever configuration
 */
const RETRIEVER_CONFIG = {
  DEFAULT_TOP_K: 5,           // Number of chunks to retrieve
  MIN_SCORE_THRESHOLD: 0.1    // Minimum similarity score
};

/**
 * ResumeProfile JSON Schema for structured output
 * Equivalent to Pydantic model in Python
 */
const RESUME_PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    candidate_name: {
      type: 'string',
      description: 'Full name of the candidate'
    },
    years_of_experience: {
      type: 'number',
      description: 'Estimated total years of professional experience'
    },
    current_role: {
      type: 'string',
      description: 'Current or most recent job title'
    },
    top_skills: {
      type: 'array',
      items: { type: 'string' },
      description: 'Top 5-10 most relevant technical and soft skills'
    },
    key_projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          tech_stack: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Technologies used'
          },
          impact: { type: 'string', description: 'Business impact or achievement' },
          source_chunk: { type: 'string', description: 'Which resume section this was found in' }
        },
        required: ['name', 'tech_stack', 'impact']
      },
      description: 'Notable projects with their tech stack and impact'
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          degree: { type: 'string' },
          institution: { type: 'string' },
          year: { type: 'string' },
          highlights: { type: 'string' }
        }
      },
      description: 'Educational background'
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key strengths based on resume analysis'
    },
    red_flags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          flag: { type: 'string', description: 'The concern identified' },
          severity: { 
            type: 'string', 
            enum: ['low', 'medium', 'high'],
            description: 'Severity level'
          },
          evidence: { type: 'string', description: 'What in the resume led to this concern' }
        }
      },
      description: 'Potential concerns: employment gaps, vague descriptions, inconsistencies, etc.'
    },
    job_fit_analysis: {
      type: 'object',
      properties: {
        fit_score: { 
          type: 'number', 
          minimum: 0, 
          maximum: 100,
          description: 'Overall fit score 0-100'
        },
        matching_skills: { type: 'array', items: { type: 'string' } },
        missing_skills: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string' }
      },
      description: 'Job fit analysis (only when job description provided)'
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          relevance: { type: 'string' },
          key_info: { type: 'string' }
        }
      },
      description: 'Which resume sections contributed to this analysis'
    }
  },
  required: ['candidate_name', 'years_of_experience', 'top_skills', 'sources']
};

/**
 * System prompt for the "Expert Reviewer" persona
 */
const REVIEWER_SYSTEM_PROMPT = `You are an expert Technical Recruiter and Engineering Manager with 15+ years of experience reviewing resumes for top tech companies.

## Your Role
Analyze resumes critically but fairly. Extract key information and provide actionable insights.

## Analysis Guidelines
1. **Skills Assessment**: Identify both technical and soft skills. Note proficiency levels when evident.
2. **Experience Evaluation**: Look at career progression, company quality, and scope of responsibilities.
3. **Project Analysis**: Assess impact, complexity, and relevance of key projects.
4. **Red Flags Detection**: Identify concerns like:
   - Employment gaps > 6 months without explanation
   - Vague or unquantified achievements
   - Job hopping (< 1 year at multiple positions)
   - Skills/experience mismatch
   - Overly generic descriptions
5. **Source Citation**: For EVERY conclusion, cite which section of the resume led to it.

## Output Requirements
- Be specific and cite evidence from the resume
- Quantify when possible (e.g., "5 years Python experience")
- For red_flags, always explain the evidence
- If information is missing or unclear, note it explicitly

You MUST respond with a valid JSON object matching the provided schema.`;

/**
 * Prompt template for resume analysis
 */
const ANALYSIS_PROMPT_TEMPLATE = `Analyze the following resume content and extract structured information.

## Retrieved Resume Sections:
{{CONTEXT}}

## Task:
{{TASK}}

## Additional Instructions:
- For each key finding, cite which section (source_chunk) it came from
- If analyzing against a job description, evaluate fit score and identify gaps
- Be critical but fair in identifying red flags
- If information seems missing or unclear, note it in the analysis

Respond with a JSON object following the ResumeProfile schema.`;

// ============================================
// RESUME ANALYZER CLASS
// ============================================

class ResumeAnalyzerService {
  constructor() {
    this.retrieverConfig = { ...RETRIEVER_CONFIG };
  }

  /**
   * Retrieve relevant chunks from vector store
   * @param {string} query - Search query
   * @param {Object} options - Retrieval options
   * @returns {Promise<Array>} Retrieved chunks with metadata
   */
  async retrieveContext(query, options = {}) {
    const {
      topK = this.retrieverConfig.DEFAULT_TOP_K,
      filter = {},
      minScore = this.retrieverConfig.MIN_SCORE_THRESHOLD
    } = options;

    console.log(`🔍 [Analyzer] Retrieving context for: "${query.substring(0, 50)}..."`);

    const results = await vectorStoreService.query(query, {
      topK,
      filter,
      includeMetadata: true
    });

    // Filter by minimum score
    const filtered = results.filter(r => (r.score || 0) >= minScore);

    console.log(`📋 [Analyzer] Retrieved ${filtered.length} relevant chunks`);

    return filtered.map(chunk => ({
      content: chunk.text || chunk.metadata?.text || '',
      section: chunk.metadata?.section || 'unknown',
      score: chunk.score,
      chunkIndex: chunk.metadata?.chunkIndex,
      docId: chunk.metadata?.docId
    }));
  }

  /**
   * Format retrieved chunks as context for LLM
   * @param {Array} chunks - Retrieved chunks
   * @returns {string} Formatted context string
   */
  formatContext(chunks) {
    if (!chunks || chunks.length === 0) {
      return 'No relevant resume content found.';
    }

    return chunks.map((chunk, i) => {
      return `### Section ${i + 1}: ${chunk.section.toUpperCase()} (Relevance: ${(chunk.score * 100).toFixed(1)}%)
${chunk.content}
---`;
    }).join('\n\n');
  }

  /**
   * Main analysis function - Analyze resume with RAG
   * @param {Object} options - Analysis options
   * @param {string} options.query - Custom query (optional)
   * @param {string} options.jobDescription - Job description for fit analysis (optional)
   * @param {string} options.userId - Filter by user ID (optional)
   * @param {string} options.docId - Filter by document ID (optional)
   * @returns {Promise<Object>} Structured ResumeProfile analysis
   */
  async analyzeResume(options = {}) {
    const {
      query = 'Provide a comprehensive analysis of this candidate',
      jobDescription = null,
      userId = null,
      docId = null,
      topK = 5
    } = options;

    console.log(`🧠 [Analyzer] Starting resume analysis...`);

    try {
      // Step 1: Build retrieval query
      let retrievalQuery = query;
      if (jobDescription) {
        // Include job description keywords in retrieval
        retrievalQuery = `${query}\n\nJob Requirements: ${jobDescription.substring(0, 500)}`;
      }

      // Step 2: Retrieve relevant context
      const filter = {};
      if (userId) filter.userId = { $eq: userId };
      if (docId) filter.docId = { $eq: docId };

      const chunks = await this.retrieveContext(retrievalQuery, { topK, filter });

      if (chunks.length === 0) {
        return {
          success: false,
          error: 'No resume content found. Please ensure a resume has been indexed.',
          suggestion: 'Upload and index a resume first using POST /api/user/resume'
        };
      }

      // Step 3: Format context
      const context = this.formatContext(chunks);

      // Step 4: Build task description
      let task = query;
      if (jobDescription) {
        task = `${query}

## Job Description to Evaluate Against:
${jobDescription}

Please include a detailed job_fit_analysis with:
- fit_score (0-100)
- matching_skills (skills the candidate has)
- missing_skills (required skills the candidate lacks)
- recommendation (hire/consider/pass with reasoning)`;
      }

      // Step 5: Build final prompt
      const userPrompt = ANALYSIS_PROMPT_TEMPLATE
        .replace('{{CONTEXT}}', context)
        .replace('{{TASK}}', task);

      // Step 6: Call LLM with structured output
      console.log(`🤖 [Analyzer] Calling LLM for analysis...`);
      const analysis = await this._callLLMWithStructuredOutput(userPrompt);

      if (!analysis.success) {
        return analysis;
      }

      // Step 7: Enrich with source information
      analysis.data.sources = chunks.map(c => ({
        section: c.section,
        relevance: `${(c.score * 100).toFixed(1)}%`,
        key_info: c.content.substring(0, 100) + '...'
      }));

      console.log(`✅ [Analyzer] Analysis complete for: ${analysis.data.candidate_name || 'Unknown'}`);

      return {
        success: true,
        data: analysis.data,
        metadata: {
          chunksAnalyzed: chunks.length,
          queryUsed: query,
          hasJobFitAnalysis: !!jobDescription
        }
      };

    } catch (error) {
      console.error(`❌ [Analyzer] Analysis failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Quick skill match analysis
   * @param {Array<string>} requiredSkills - Skills to check for
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Skill match results
   */
  async analyzeSkillMatch(requiredSkills, options = {}) {
    const skillQuery = `Find experience with: ${requiredSkills.join(', ')}`;
    
    const chunks = await this.retrieveContext(skillQuery, {
      topK: 10,
      ...options
    });

    const skillMatches = {};
    const foundSkills = [];
    const missingSkills = [];

    for (const skill of requiredSkills) {
      const skillLower = skill.toLowerCase();
      const matchingChunks = chunks.filter(c => 
        c.content.toLowerCase().includes(skillLower)
      );

      if (matchingChunks.length > 0) {
        foundSkills.push(skill);
        skillMatches[skill] = {
          found: true,
          evidence: matchingChunks.map(c => ({
            section: c.section,
            relevance: c.score,
            snippet: this._extractSkillSnippet(c.content, skill)
          }))
        };
      } else {
        missingSkills.push(skill);
        skillMatches[skill] = { found: false, evidence: [] };
      }
    }

    return {
      success: true,
      data: {
        totalRequired: requiredSkills.length,
        totalFound: foundSkills.length,
        matchRate: (foundSkills.length / requiredSkills.length * 100).toFixed(1) + '%',
        foundSkills,
        missingSkills,
        details: skillMatches
      }
    };
  }

  /**
   * Extract snippet around skill mention
   * @private
   */
  _extractSkillSnippet(text, skill) {
    const lowerText = text.toLowerCase();
    const skillLower = skill.toLowerCase();
    const index = lowerText.indexOf(skillLower);
    
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + skill.length + 50);
    
    return '...' + text.substring(start, end) + '...';
  }

  /**
   * Call LLM with structured output enforcement
   * @private
   */
  async _callLLMWithStructuredOutput(userPrompt) {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: REVIEWER_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,  // Lower for consistent structured output
          max_tokens: 3000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          timeout: 60000
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Log what we received for debugging
      console.log(`📝 [Analyzer] LLM response keys: ${Object.keys(parsed).join(', ')}`);

      // Deep extract from nested structures (LLM sometimes wraps in candidateAnalysis)
      let data = parsed;
      if (parsed.candidateAnalysis) {
        data = { ...parsed, ...parsed.candidateAnalysis };
      }
      if (parsed.analysis && typeof parsed.analysis === 'object') {
        data = { ...data, ...parsed.analysis };
      }

      // Normalize field names (handle many variations)
      const normalized = {
        candidate_name: data.candidate_name || data.name || data.candidateName || 
                        data.full_name || data.fullName || 'Unknown',
        years_of_experience: data.years_of_experience || data.yearsOfExperience || 
                             data.experience_years || data.totalExperience || 0,
        current_role: data.current_role || data.currentRole || data.role || 
                      data.position || data.title || '',
        top_skills: data.top_skills || data.topSkills || data.skills || 
                    data.technical_skills || data.technicalSkills || [],
        key_projects: data.key_projects || data.keyProjects || data.projects || 
                      data.notable_projects || [],
        education: data.education || data.educationBackground || [],
        strengths: data.strengths || data.highlights || data.strong_points || [],
        red_flags: data.red_flags || data.redFlags || data.concerns || 
                   data.potential_concerns || data.warnings || [],
        job_fit_analysis: data.job_fit_analysis || data.jobFitAnalysis || 
                          data.fit_analysis || data.fitAnalysis ||
                          (data.fit_score !== undefined ? {
                            fit_score: data.fit_score,
                            matching_skills: data.matching_skills || [],
                            missing_skills: data.missing_skills || [],
                            recommendation: data.recommendation || ''
                          } : null),
        summary: (typeof data.summary === 'string' ? data.summary : '') || 
                 (typeof data.analysis === 'string' ? data.analysis : '') ||
                 (typeof data.overview === 'string' ? data.overview : '') || '',
        sources: data.sources || [],
        // Keep raw response for debugging
        _raw: parsed
      };

      // Ensure arrays are arrays
      if (!Array.isArray(normalized.top_skills)) {
        normalized.top_skills = Object.keys(normalized.top_skills || {});
      }
      if (!Array.isArray(normalized.key_projects)) {
        normalized.key_projects = [];
      }
      if (!Array.isArray(normalized.red_flags)) {
        normalized.red_flags = [];
      }

      return {
        success: true,
        data: normalized
      };

    } catch (error) {
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error?.message || 'LLM request failed'
        };
      }
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const resumeAnalyzerService = new ResumeAnalyzerService();

// ============================================
// EXPORTS
// ============================================

module.exports = {
  resumeAnalyzerService,
  ResumeAnalyzerService,
  RESUME_PROFILE_SCHEMA,
  REVIEWER_SYSTEM_PROMPT,
  RETRIEVER_CONFIG
};

