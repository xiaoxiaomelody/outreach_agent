/**
 * Contact Controller
 * Handles contact search and management operations with AI summaries
 */

const hunterWithSummaries = require('../services/hunter-with-summaries.service');
const { validateLimit, isValidDomain } = require('../utils/validation');

/**
 * Find contacts at a company with AI summaries
 * POST /api/contacts/company
 */
const findCompanyContacts = async (req, res) => {
  try {
    const { company, limit = 10 } = req.body;
    
    if (!company) {
      return res.status(400).json({ 
        error: 'Company domain is required' 
      });
    }

    // Validate domain format
    if (!isValidDomain(company)) {
      return res.status(400).json({ 
        error: 'Invalid domain format. Use format like: stripe.com' 
      });
    }

    const validLimit = validateLimit(limit, 20);

    console.log(`🔍 Searching for contacts at ${company} (limit: ${validLimit})`);
    
    // Call Hunter.io with AI summaries
    const result = await hunterWithSummaries.domainSearchWithSummaries(company, {
      limit: validLimit
    });
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to find company contacts' 
      });
    }

    console.log(`✅ Found ${result.data.contacts.length} contacts with AI summaries`);

    res.json({
      success: true,
      company: result.data.organization,
      domain: result.data.domain,
      pattern: result.data.pattern,
      contacts: result.data.contacts,
      total: result.data.meta?.results || result.data.contacts.length,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Find company contacts error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

/**
 * Search contacts by department with AI summaries
 * POST /api/contacts/search-by-department
 */
const searchByDepartment = async (req, res) => {
  try {
    const { company, department, limit = 10 } = req.body;
    
    if (!company || !department) {
      return res.status(400).json({ 
        error: 'Company and department are required' 
      });
    }

    const validLimit = validateLimit(limit, 20);

    const result = await hunterWithSummaries.searchByDepartmentWithSummaries(
      company,
      department,
      validLimit
    );
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to search contacts' 
      });
    }

    res.json({
      success: true,
      company: result.data.organization,
      department,
      contacts: result.data.contacts,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Search by department error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

/**
 * Search contacts by seniority with AI summaries
 * POST /api/contacts/search-by-seniority
 */
const searchBySeniority = async (req, res) => {
  try {
    const { company, seniority, limit = 10 } = req.body;
    
    if (!company || !seniority) {
      return res.status(400).json({ 
        error: 'Company and seniority are required' 
      });
    }

    const validLimit = validateLimit(limit, 20);

    const result = await hunterWithSummaries.searchBySeniorityWithSummaries(
      company,
      seniority,
      validLimit
    );
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to search contacts' 
      });
    }

    res.json({
      success: true,
      company: result.data.organization,
      seniority,
      contacts: result.data.contacts,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Search by seniority error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

/**
 * Natural language search with AI summaries
 * POST /api/contacts/natural-search
 */
const naturalLanguageSearch = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Search query is required' 
      });
    }

    console.log(`🗣️ Natural language search: "${query}"`);

    const result = await hunterWithSummaries.naturalLanguageSearchWithSummaries(query);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to search contacts' 
      });
    }

    res.json({
      success: true,
      query,
      contacts: result.data.contacts,
      userId: req.user.uid
    });
  } catch (error) {
    console.error('Natural language search error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
};

module.exports = {
  findCompanyContacts,
  searchByDepartment,
  searchBySeniority,
  naturalLanguageSearch
};
