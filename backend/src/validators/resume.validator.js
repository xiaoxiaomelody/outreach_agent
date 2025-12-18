/**
 * Resume Validator
 * Defensive validation for resume documents - Fail-Fast mechanism
 * Rejects invalid documents BEFORE expensive chunking/embedding operations
 */

// ============================================
// CUSTOM ERRORS
// ============================================

/**
 * Custom error for invalid document detection
 */
class InvalidDocumentError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InvalidDocumentError';
    this.details = details;
    this.statusCode = 422; // Unprocessable Entity
  }
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Validation configuration
 */
const VALIDATION_CONFIG = {
  // Length constraints
  MIN_LENGTH: 50,           // Likely empty or OCR failure
  MAX_LENGTH: 100000,       // Likely a book/report, not a resume
  
  // Keyword matching
  KEYWORD_CHECK_LENGTH: 2000,  // Check first N characters
  MIN_KEYWORD_MATCHES: 2,      // Minimum keywords required to pass
  
  // Mandatory keywords (English + Chinese)
  RESUME_KEYWORDS: [
    // English keywords
    'education',
    'experience',
    'skills',
    'resume',
    'cv',
    'work history',
    'employment',
    'qualifications',
    'professional',
    'career',
    // Chinese keywords
    '教育',
    '经历',
    '工作',
    '技能',
    '项目',
    '简历',
    '履历',
    '职业',
    '经验',
    '学历'
  ]
};

// ============================================
// RESUME VALIDATOR CLASS
// ============================================

/**
 * ResumeValidator Class
 * Validates extracted text to ensure it's a valid resume
 */
class ResumeValidator {
  constructor(config = {}) {
    this.config = { ...VALIDATION_CONFIG, ...config };
  }

  /**
   * Main validation method - Fail-Fast
   * @param {string} text - Extracted text from PDF
   * @returns {Object} Validation result
   * @throws {InvalidDocumentError} If validation fails
   */
  validate(text) {
    const results = {
      isValid: true,
      checks: {},
      warnings: []
    };

    // Check 1: Text exists and is string
    if (!text || typeof text !== 'string') {
      throw new InvalidDocumentError(
        'No text content found in document',
        { check: 'content_exists', received: typeof text }
      );
    }

    // Normalize text for checking
    const normalizedText = text.trim();
    const textLength = normalizedText.length;

    // Check 2: Minimum length (likely empty or OCR failure)
    results.checks.lengthCheck = this._checkLength(textLength);
    if (!results.checks.lengthCheck.passed) {
      throw new InvalidDocumentError(
        results.checks.lengthCheck.message,
        { 
          check: 'length',
          textLength,
          minRequired: this.config.MIN_LENGTH,
          maxAllowed: this.config.MAX_LENGTH
        }
      );
    }

    // Check 3: Keyword heuristics (rule-based)
    results.checks.keywordCheck = this._checkKeywords(normalizedText);
    if (!results.checks.keywordCheck.passed) {
      throw new InvalidDocumentError(
        results.checks.keywordCheck.message,
        {
          check: 'keywords',
          foundKeywords: results.checks.keywordCheck.foundKeywords,
          requiredCount: this.config.MIN_KEYWORD_MATCHES
        }
      );
    }

    // Add warnings for edge cases (don't fail, but inform)
    if (textLength > 50000) {
      results.warnings.push('Document is unusually long for a resume. Consider condensing.');
    }

    // TODO: [Future Enhancement] LLM Sanity Check
    // Placeholder for lightweight LLM check (e.g., "Is this a resume?")
    // This would add extra cost per document, so keeping rule-based for now.
    // results.checks.llmCheck = await this._llmSanityCheck(normalizedText);

    results.textLength = textLength;
    results.keywordsFound = results.checks.keywordCheck.foundKeywords;

    return results;
  }

  /**
   * Check text length constraints
   * @private
   */
  _checkLength(length) {
    if (length < this.config.MIN_LENGTH) {
      return {
        passed: false,
        message: `Document too short (${length} characters). Minimum ${this.config.MIN_LENGTH} characters required. The file may be empty, corrupted, or image-only without extractable text.`,
        type: 'too_short'
      };
    }

    if (length > this.config.MAX_LENGTH) {
      return {
        passed: false,
        message: `Document too long (${length} characters). Maximum ${this.config.MAX_LENGTH} characters allowed. This appears to be a book, report, or non-resume document.`,
        type: 'too_long'
      };
    }

    return {
      passed: true,
      message: 'Length check passed',
      length
    };
  }

  /**
   * Check for resume-related keywords
   * @private
   */
  _checkKeywords(text) {
    // Check only the first N characters for keywords
    const checkText = text
      .substring(0, this.config.KEYWORD_CHECK_LENGTH)
      .toLowerCase();

    const foundKeywords = [];

    for (const keyword of this.config.RESUME_KEYWORDS) {
      if (checkText.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }

    const passed = foundKeywords.length >= this.config.MIN_KEYWORD_MATCHES;

    return {
      passed,
      foundKeywords,
      matchCount: foundKeywords.length,
      requiredCount: this.config.MIN_KEYWORD_MATCHES,
      message: passed
        ? `Found ${foundKeywords.length} resume keywords: ${foundKeywords.join(', ')}`
        : `Document does not appear to be a resume. Found only ${foundKeywords.length} resume-related keywords (need at least ${this.config.MIN_KEYWORD_MATCHES}). Please upload a valid resume or CV.`
    };
  }

  /**
   * [PLACEHOLDER] LLM Sanity Check
   * Lightweight LLM check to verify document is a resume
   * Currently not implemented to save API costs
   * @private
   */
  // async _llmSanityCheck(text) {
  //   // TODO: Implement when needed
  //   // const prompt = "Is the following text from a resume/CV? Answer only 'yes' or 'no'.";
  //   // const sample = text.substring(0, 500);
  //   // const result = await openaiService.chatCompletion(prompt, sample);
  //   // return {
  //   //   passed: result.data.toLowerCase().includes('yes'),
  //   //   confidence: 'low' // LLM confidence estimation
  //   // };
  //   return { passed: true, skipped: true, reason: 'LLM check not implemented' };
  // }

  /**
   * Quick validation without throwing errors
   * Returns boolean for simple checks
   */
  isValid(text) {
    try {
      this.validate(text);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get validation result without throwing
   * Returns result object with isValid flag
   */
  validateSafe(text) {
    try {
      const result = this.validate(text);
      return { isValid: true, ...result };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        details: error.details || {}
      };
    }
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  ResumeValidator,
  InvalidDocumentError,
  VALIDATION_CONFIG
};



