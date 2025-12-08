/**
 * Hunter.io with AI Summaries Service
 * Combines Hunter.io contact data with OpenAI-generated summaries
 */

const hunterDirect = require('./hunter-direct.service');
const openaiService = require('./openai.service');
const { getFirestore } = require('../config/firebase');
const fs = require('fs');
const path = require('path');

/**
 * Load trained model weights if available, otherwise use defaults
 */
function loadTrainedWeights() {
  try {
    const weightsPath = path.join(__dirname, '..', '..', 'models', 'trained-weights.json');
    if (fs.existsSync(weightsPath)) {
      const data = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
      console.log('✓ Loaded trained weights from', weightsPath);
      return data.weights;
    }
  } catch (error) {
    console.warn('Could not load trained weights:', error.message);
  }
  return null;
}

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
          // Attach summaries and optionally re-rank
          let contactsWithSummaries = summariesResult.contacts;

          // If options.query or other criteria provided, run a simple deterministic re-ranker
          if (options.query || options.department || options.seniority) {
            contactsWithSummaries = reRankContacts(contactsWithSummaries, {
              query: options.query,
              department: options.department,
              seniority: options.seniority,
              limit: options.limit
            });
          }

          return {
            success: true,
            data: {
              ...hunterResult.data,
              contacts: contactsWithSummaries
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
 * Simple deterministic re-ranker
 * Combines normalized signals into a single relevance score and sorts contacts.
 * Uses trained weights from ML model if available, otherwise uses defaults.
 * Operates in O(n) time.
 */
const reRankContacts = (contacts = [], opts = {}) => {
  const query = (opts.query || '').toLowerCase();
  const departmentGoal = opts.department ? String(opts.department).toLowerCase() : null;
  const seniorityGoal = opts.seniority ? String(opts.seniority).toLowerCase() : null;
  const limit = opts.limit || contacts.length;

  // Load trained weights if available, otherwise use defaults
  const trainedWeights = loadTrainedWeights();
  const defaultWeights = {
    titleMatch: 0.4,
    semanticScore: 0.4,
    deptMatch: 0.1,
    seniorMatch: 0.1
  };
  const weights = trainedWeights || Object.assign(defaultWeights, opts.weights || {});

  // Helper: normalize confidence (Hunter gives 0-100 sometimes)
  const normalizeConfidence = (c) => {
    if (c === undefined || c === null) return 0;
    let n = Number(c);
    if (isNaN(n)) return 0;
    if (n > 1) n = Math.min(100, n) / 100; // assume 0-100 scale
    return Math.max(0, Math.min(1, n));
  };

  // Helper: simple Jaccard similarity between query and target text
  const jaccard = (a = '', b = '') => {
    if (!a || !b) return 0;
    const tokenize = (s) => (s || '')
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 2);
    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));
    if (A.size === 0 || B.size === 0) return 0;
    const inter = [...A].filter(x => B.has(x)).length;
    const uni = new Set([...A, ...B]).size;
    return uni === 0 ? 0 : inter / uni;
  };

  // Score each contact
  const scored = contacts.map(contact => {
    // Title match score: how much query overlaps with position/title
    const titleText = (contact.position || contact.role || contact.title || contact.position_raw || '').toString();
    const titleScore = Math.max(jaccard(query, titleText), jaccard(query, (contact.name || '')));

    // Department/seniority alignment: boost when explicit match present
    let deptMatch = 0;
    if (departmentGoal && contact.department) {
      deptMatch = String(contact.department).toLowerCase().includes(departmentGoal) ? 1 : 0;
    }
    let seniorMatch = 0;
    if (seniorityGoal && contact.seniority) {
      seniorMatch = String(contact.seniority).toLowerCase().includes(seniorityGoal) ? 1 : 0;
    }

    // Semantic similarity: use summary if exists, else position or name
    const semanticSource = contact.summary || contact.snippet || contact.position || contact.name || '';
    const semanticScore = jaccard(query, semanticSource);

    // Compose final score using learned weights (no Hunter.io confidence/verification)
    const score = (
      weights.titleMatch * titleScore +
      weights.semanticScore * semanticScore +
      weights.deptMatch * deptMatch +
      weights.seniorMatch * seniorMatch
    );

    return Object.assign({}, contact, { _relevanceScore: score });
  });

  // Sort descending by score
  scored.sort((a, b) => (b._relevanceScore || 0) - (a._relevanceScore || 0));

  // Return top-k (respect original order for ties)
  return scored.slice(0, Math.max(0, limit));
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

/**
 * Alias functions for compatibility with controller naming
 */
const getCompanyContactsWithSummaries = async (domain, limit = 10, options = {}) => {
  return domainSearchWithSummaries(domain, Object.assign({}, options, { limit }));
};

const getContactsByDepartmentWithSummaries = async (domain, department, limit = 10, options = {}) => {
  return searchByDepartmentWithSummaries(domain, department, Object.assign({}, options, { limit }));
};

const getContactsBySeniorityWithSummaries = async (domain, seniority, limit = 10, options = {}) => {
  return searchBySeniorityWithSummaries(domain, seniority, Object.assign({}, options, { limit }));
};

module.exports = {
  domainSearchWithSummaries,
  searchByDepartmentWithSummaries,
  searchBySeniorityWithSummaries,
  naturalLanguageSearchWithSummaries,
  // Alias exports for controller compatibility
  getCompanyContactsWithSummaries,
  getContactsByDepartmentWithSummaries,
  getContactsBySeniorityWithSummaries
};

