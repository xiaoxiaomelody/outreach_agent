/**
 * NLP Search Controller
 * Handles natural language contact search queries
 */

const openaiService = require('../services/openai.service');
const hunterWithSummariesService = require('../services/hunter-with-summaries.service');

/**
 * Process natural language search query
 * POST /api/search/nlp
 * Body: { query: string }
 */
const nlpSearch = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a search query'
      });
    }

    console.log(`🤖 Processing NLP query: "${query}"`);

    // Step 1: Parse the natural language query using OpenAI
    const parseResult = await openaiService.parseContactSearchQuery(query);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error,
        suggestion: 'Try something like: "Find 10 engineers at Google" or "Show me marketing people at Stripe"'
      });
    }

    const { company, count, role, department, seniority } = parseResult.data;

    console.log(`📊 Parsed criteria:`, parseResult.data);

    // Step 2: Determine which Hunter.io API to call based on parsed criteria
    let searchResult;

    if (department) {
      // Department-specific search
      console.log(`🔍 Searching by department: ${department} at ${company}`);
      searchResult = await hunterWithSummariesService.getContactsByDepartmentWithSummaries(
        company,
        department,
        count,
        { query }
      );
    } else if (seniority) {
      // Seniority-specific search
      console.log(`🔍 Searching by seniority: ${seniority} at ${company}`);
      searchResult = await hunterWithSummariesService.getContactsBySeniorityWithSummaries(
        company,
        seniority,
        count,
        { query }
      );
    } else {
      // General company search
      console.log(`🔍 Searching company: ${company}`);
      searchResult = await hunterWithSummariesService.getCompanyContactsWithSummaries(
        company,
        count,
        { query }
      );
    }

    if (!searchResult.success) {
      return res.status(500).json({
        success: false,
        error: searchResult.error || 'Failed to find contacts',
        parsedQuery: parseResult.data
      });
    }

    // Step 3: Return results with parsed query info
    // Handle both data structure formats: searchResult.data (array) or searchResult.data.contacts (object with contacts array)
    const contacts = Array.isArray(searchResult.data) 
      ? searchResult.data 
      : (searchResult.data?.contacts || []);

    console.log(`✅ Found ${contacts.length} contacts for "${query}"`);

    res.json({
      success: true,
      data: {
        contacts,
        query: parseResult.data.originalQuery,
        parsedCriteria: {
          company,
          count,
          role,
          department,
          seniority
        },
        resultCount: contacts.length
      },
      userId: req.user?.uid || 'dev-user'
    });
  } catch (error) {
    console.error('NLP search error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      suggestion: 'Please try rephrasing your query'
    });
  }
};

/**
 * Get search suggestions based on partial query
 * POST /api/search/suggest
 * Body: { partial: string }
 */
const getSuggestions = async (req, res) => {
  try {
    const { partial } = req.body;

    // Return common search patterns as suggestions
    const suggestions = [
      'Find 10 engineers at Google',
      'Show me marketing people at Stripe',
      'Get senior executives from Microsoft',
      'Find contacts at Amazon',
      'Search for 5 designers at Apple',
      'Find sales team at Salesforce',
      'Get 15 developers from Meta',
      'Show me executives at Tesla'
    ];

    // Filter suggestions based on partial input
    const filtered = partial && partial.length > 0
      ? suggestions.filter(s => s.toLowerCase().includes(partial.toLowerCase()))
      : suggestions.slice(0, 4);

    res.json({
      success: true,
      suggestions: filtered
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  nlpSearch,
  getSuggestions
};
