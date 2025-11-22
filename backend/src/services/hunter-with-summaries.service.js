/**
 * Hunter.io with AI Summaries Service
 * Combines Hunter.io contact data with OpenAI-generated summaries
 */

const hunterDirect = require('./hunter-direct.service');
const openaiService = require('./openai.service');

/**
 * Domain search with AI-generated summaries for each contact
 * @param {string} domain - Company domain
 * @param {Object} options - Search options
 * @param {boolean} options.includeSummaries - Whether to generate AI summaries (default: true)
 * @returns {Promise<Object>} Contacts with summaries
 */
const domainSearchWithSummaries = async (domain, options = {}) => {
  try {
    // Get contacts from Hunter.io
    const hunterResult = await hunterDirect.domainSearch(domain, options);
    
    if (!hunterResult.success) {
      return hunterResult;
    }

    // Generate summaries if requested (default: true)
    const includeSummaries = options.includeSummaries !== false;
    
    if (includeSummaries && hunterResult.data.contacts.length > 0) {
      console.log(`Generating AI summaries for ${hunterResult.data.contacts.length} contacts...`);
      
      const summariesResult = await openaiService.generateContactSummaries(
        hunterResult.data.contacts
      );
      
      if (summariesResult.success) {
        return {
          success: true,
          data: {
            ...hunterResult.data,
            contacts: summariesResult.contacts
          }
        };
      } else {
        // Return contacts without summaries if generation fails
        console.warn('Summary generation failed, returning contacts without summaries');
        return hunterResult;
      }
    }

    return hunterResult;
  } catch (error) {
    console.error('Domain search with summaries error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Search by department with summaries
 * @param {string} domain - Company domain
 * @param {string} department - Department name
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Contacts with summaries
 */
const searchByDepartmentWithSummaries = async (domain, department, limit = 10) => {
  return domainSearchWithSummaries(domain, { department, limit });
};

/**
 * Search by seniority with summaries
 * @param {string} domain - Company domain
 * @param {string} seniority - Seniority level
 * @param {number} limit - Number of results
 * @returns {Promise<Object>} Contacts with summaries
 */
const searchBySeniorityWithSummaries = async (domain, seniority, limit = 10) => {
  return domainSearchWithSummaries(domain, { seniority, limit });
};

/**
 * Natural language search with summaries
 * Parses user query, searches Hunter.io, and adds AI summaries
 * @param {string} query - Natural language query
 * @returns {Promise<Object>} Contacts with summaries
 */
const naturalLanguageSearchWithSummaries = async (query) => {
  try {
    // Extract search criteria using OpenAI
    console.log('Parsing search query...');
    const criteriaResult = await openaiService.extractSearchCriteria(query);
    
    if (!criteriaResult.success) {
      return {
        success: false,
        error: 'Failed to parse search query'
      };
    }

    const { company, role, department, count } = criteriaResult.criteria;
    
    if (!company) {
      return {
        success: false,
        error: 'Could not extract company name from query'
      };
    }

    console.log('Extracted criteria:', criteriaResult.criteria);
    
    // Search Hunter.io with extracted criteria
    const result = await domainSearchWithSummaries(company, {
      department,
      limit: count || 10
    });

    return result;
  } catch (error) {
    console.error('Natural language search error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  domainSearchWithSummaries,
  searchByDepartmentWithSummaries,
  searchBySeniorityWithSummaries,
  naturalLanguageSearchWithSummaries
};

