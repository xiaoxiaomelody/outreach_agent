/**
 * Hunter.io Direct API Service
 * Direct integration with Hunter.io REST API (no OpenAI MCP needed)
 * API Documentation: https://hunter.io/api-documentation/v2
 */

const axios = require('axios');

// Constants
const HUNTER_API_BASE_URL = 'https://api.hunter.io/v2';
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

/**
 * Validate API key
 */
const validateConfig = () => {
  if (!HUNTER_API_KEY) {
    throw new Error('HUNTER_API_KEY is not set in environment variables');
  }
};

/**
 * Domain Search - Find all email addresses for a domain
 * @param {string} domain - Company domain (e.g., 'stripe.com')
 * @param {Object} options - Search options
 * @param {number} options.limit - Number of results (default: 10, max: 100)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @param {string} options.type - Email type: 'personal' or 'generic'
 * @param {string} options.seniority - Seniority level: 'junior', 'senior', 'executive'
 * @param {string} options.department - Department: 'executive', 'it', 'finance', 'management', 'sales', 'legal', 'support', 'hr', 'marketing', 'communication'
 * @returns {Promise<Object>} Search results
 */
const domainSearch = async (domain, options = {}) => {
  try {
    validateConfig();

    const params = {
      domain,
      api_key: HUNTER_API_KEY,
      limit: options.limit || 1,
      offset: options.offset || 0,
      ...(options.type && { type: options.type }),
      ...(options.seniority && { seniority: options.seniority }),
      ...(options.department && { department: options.department })
    };

    const response = await axios.get(`${HUNTER_API_BASE_URL}/domain-search`, {
      params,
      timeout: 30000
    });

    // Format the response - preserve Hunter.io's original field names
    const contacts = response.data.data.emails.map(email => ({
      // Keep original Hunter.io snake_case fields for frontend compatibility
      first_name: email.first_name,
      last_name: email.last_name,
      value: email.value, // This is Hunter's field name for email address
      position: email.position,
      department: email.department,
      seniority: email.seniority,
      linkedin: email.linkedin,
      twitter: email.twitter,
      confidence: email.confidence,
      verification: email.verification,
      sources: email.sources,
      // Additional computed/aliased fields
      name: `${email.first_name} ${email.last_name}`,
      email: email.value, // Alias for convenience
      company: response.data.data.organization,
      verified: email.verification?.status === 'valid'
    }));

    return {
      success: true,
      data: {
        domain: response.data.data.domain,
        organization: response.data.data.organization,
        pattern: response.data.data.pattern,
        contacts,
        meta: response.data.meta
      }
    };
  } catch (error) {
    console.error('Hunter.io Domain Search Error:', error.message);
    return handleError(error);
  }
};

/**
 * Email Finder - Find the email address of a specific person
 * @param {string} domain - Company domain
 * @param {string} firstName - Person's first name
 * @param {string} lastName - Person's last name
 * @returns {Promise<Object>} Email finding results
 */
const emailFinder = async (domain, firstName, lastName) => {
  try {
    validateConfig();

    const params = {
      domain,
      first_name: firstName,
      last_name: lastName,
      api_key: HUNTER_API_KEY
    };

    const response = await axios.get(`${HUNTER_API_BASE_URL}/email-finder`, {
      params,
      timeout: 30000
    });

    return {
      success: true,
      data: {
        email: response.data.data.email,
        firstName: response.data.data.first_name,
        lastName: response.data.data.last_name,
        position: response.data.data.position,
        company: response.data.data.company,
        confidence: response.data.data.score,
        sources: response.data.data.sources
      }
    };
  } catch (error) {
    console.error('Hunter.io Email Finder Error:', error.message);
    return handleError(error);
  }
};

/**
 * Email Verifier - Verify if an email address is deliverable
 * @param {string} email - Email address to verify
 * @returns {Promise<Object>} Verification results
 */
const emailVerifier = async (email) => {
  try {
    validateConfig();

    const params = {
      email,
      api_key: HUNTER_API_KEY
    };

    const response = await axios.get(`${HUNTER_API_BASE_URL}/email-verifier`, {
      params,
      timeout: 30000
    });

    return {
      success: true,
      data: {
        email: response.data.data.email,
        status: response.data.data.status,
        result: response.data.data.result,
        score: response.data.data.score,
        regexp: response.data.data.regexp,
        gibberish: response.data.data.gibberish,
        disposable: response.data.data.disposable,
        webmail: response.data.data.webmail,
        mxRecords: response.data.data.mx_records,
        smtp: response.data.data.smtp_server,
        smtpCheck: response.data.data.smtp_check,
        acceptAll: response.data.data.accept_all,
        block: response.data.data.block
      }
    };
  } catch (error) {
    console.error('Hunter.io Email Verifier Error:', error.message);
    return handleError(error);
  }
};

/**
 * Email Count - Get the number of email addresses for a domain
 * @param {string} domain - Company domain
 * @returns {Promise<Object>} Email count results
 */
const emailCount = async (domain) => {
  try {
    validateConfig();

    const params = {
      domain,
      api_key: HUNTER_API_KEY
    };

    const response = await axios.get(`${HUNTER_API_BASE_URL}/email-count`, {
      params,
      timeout: 30000
    });

    return {
      success: true,
      data: {
        total: response.data.data.total,
        personal: response.data.data.personal_emails,
        generic: response.data.data.generic_emails
      }
    };
  } catch (error) {
    console.error('Hunter.io Email Count Error:', error.message);
    return handleError(error);
  }
};

/**
 * Search contacts by department at a company
 * @param {string} domain - Company domain
 * @param {string} department - Department name
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Contacts in department
 */
const searchByDepartment = async (domain, department, limit = 10) => {
  return domainSearch(domain, { department, limit });
};

/**
 * Search contacts by seniority at a company
 * @param {string} domain - Company domain
 * @param {string} seniority - Seniority level
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Contacts by seniority
 */
const searchBySeniority = async (domain, seniority, limit = 10) => {
  return domainSearch(domain, { seniority, limit });
};

/**
 * Get account information (API usage, limits, etc.)
 * @returns {Promise<Object>} Account information
 */
const getAccountInfo = async () => {
  try {
    validateConfig();

    const response = await axios.get(`${HUNTER_API_BASE_URL}/account`, {
      params: { api_key: HUNTER_API_KEY },
      timeout: 30000
    });

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Hunter.io Account Info Error:', error.message);
    return handleError(error);
  }
};

/**
 * Error handler
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
const handleError = (error) => {
  if (error.response) {
    // API responded with error
    const errorData = error.response.data?.errors?.[0];
    return {
      success: false,
      error: errorData?.details || error.response.data?.message || 'API request failed',
      statusCode: error.response.status,
      errorId: errorData?.id
    };
  } else if (error.request) {
    // Request made but no response
    return {
      success: false,
      error: 'No response from Hunter.io API server'
    };
  } else {
    // Other errors
    return {
      success: false,
      error: error.message
    };
  }
};

// Export functions
module.exports = {
  domainSearch,
  emailFinder,
  emailVerifier,
  emailCount,
  searchByDepartment,
  searchBySeniority,
  getAccountInfo,
  // Export for testing
  validateConfig
};

