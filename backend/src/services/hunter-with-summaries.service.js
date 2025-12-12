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
 * Very small, interpretable linear blend; weights are configurable.
 * Operates in O(n) time.
 */
const reRankContacts = (contacts = [], opts = {}) => {
  const query = (opts.query || '').toLowerCase();
  const departmentGoal = opts.department ? String(opts.department).toLowerCase() : null;
  const seniorityGoal = opts.seniority ? String(opts.seniority).toLowerCase() : null;
  const limit = opts.limit || contacts.length;

  // Default weights (sum to 1)
  const weights = Object.assign({
    confidence: 0.4,
    verification: 0.25,
    title: 0.2,
    semantic: 0.15
  }, opts.weights || {});

  // Try to load trained weights produced by the local trainer and map them
  // to the title/semantic split. We keep confidence/verification as base
  // and let the trained model distribute the remaining mass.
  try {
    const trainedPath = path.join(__dirname, '..', '..', 'models', 'trained-weights.json');
    if (fs.existsSync(trainedPath)) {
      const raw = fs.readFileSync(trainedPath, 'utf8');
      const parsed = JSON.parse(raw);
      const t = parsed.weights || {};
      const titleScore = Number(t.titleMatch || t.title || 0);
      const semanticScore = Number(t.semanticScore || t.semantic || 0);
      const deptScore = Number(t.deptMatch || 0);
      const seniorScore = Number(t.seniorMatch || 0);

      const baseOther = (weights.confidence || 0) + (weights.verification || 0);
      const remaining = Math.max(0, 1 - baseOther);
      const denom = (titleScore + semanticScore) || 1;
      weights.title = (titleScore / denom) * remaining;
      weights.semantic = (semanticScore / denom) * remaining;

      // scale dept/senior boosts by trained magnitudes (keeps previous 0.05 multiplier)
      weights._deptBoost = 0.05 * deptScore;
      weights._seniorBoost = 0.05 * seniorScore;
      console.log(`Loaded trained weights from ${trainedPath}: title=${weights.title.toFixed(3)}, semantic=${weights.semantic.toFixed(3)}, deptBoost=${weights._deptBoost.toFixed(3)}, seniorBoost=${weights._seniorBoost.toFixed(3)}`);
    }
  } catch (e) {
    // ignore; proceed with defaults
  }

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
    const normalize = s => (s || '').toLowerCase();
    const tokenize = (s) => normalize(s)
      .split(/\W+/)
      .filter(t => t.length > 1); // allow 2-letter tokens

    const A = new Set(tokenize(a));
    const B = new Set(tokenize(b));

    // If either side tokenizes to empty, fall back to substring check
    if (A.size === 0 || B.size === 0) {
      const na = normalize(a);
      const nb = normalize(b);
      if (!na || !nb) return 0;
      if (na.includes(nb) || nb.includes(na)) return 0.5; // partial signal
      return 0;
    }

    const inter = [...A].filter(x => B.has(x)).length;
    const uni = new Set([...A, ...B]).size;
    return uni === 0 ? 0 : inter / uni;
  };

  // Score each contact
  const scored = contacts.map(contact => {
    // Hunter confidence
    const conf = normalizeConfidence(contact.confidence || contact.confidence_score || contact.confidenceScore || 0);

    // Verification flag (boolean)
    const verified = contact.verified === true || contact.verification?.status === 'valid' ? 1 : 0;

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

    // Compose final score using weights; include small contributions from dept/seniority
    const deptBoost = (weights._deptBoost !== undefined) ? weights._deptBoost : 0.05;
    const seniorBoost = (weights._seniorBoost !== undefined) ? weights._seniorBoost : 0.05;
    const score = (
      (weights.confidence || 0) * conf +
      (weights.verification || 0) * verified +
      (weights.title || 0) * titleScore +
      (weights.semantic || 0) * semanticScore +
      deptBoost * deptMatch +
      seniorBoost * seniorMatch
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

