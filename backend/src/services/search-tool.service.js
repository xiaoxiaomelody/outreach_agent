/**
 * Search Tool Service
 * Reusable search logic for AI Agent Function Calling
 * 
 * Extracts core search logic (Hunter.io + OpenAI summaries + Re-ranking)
 * to be callable by the Chatbot Agent.
 */

const hunterWithSummariesService = require('./hunter-with-summaries.service');

/**
 * Tool definition for OpenAI Function Calling
 * This defines the "Contacts" tool schema
 */
const CONTACTS_TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'Contacts',
    description: 'Search for business contacts at a company. Returns contact information including name, email, position, department, and AI-generated summaries.',
    parameters: {
      type: 'object',
      properties: {
        company: {
          type: 'string',
          description: 'The company domain or name to search (e.g., "google.com" or "Google")'
        },
        role: {
          type: 'string',
          description: 'Job role or title to filter by (e.g., "engineer", "designer", "manager")'
        },
        count: {
          type: 'integer',
          description: 'Number of contacts to return (default: 10, max: 50)',
          default: 10
        },
        department: {
          type: 'string',
          description: 'Department to filter by (e.g., "engineering", "marketing", "sales", "hr", "finance", "executive")'
        },
        seniority: {
          type: 'string',
          description: 'Seniority level to filter by (e.g., "junior", "senior", "executive")'
        }
      },
      required: ['company']
    }
  }
};

/**
 * Execute contact search with structured parameters
 * This is the main function called by the AI Agent
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.company - Company domain or name (required)
 * @param {string} [params.role] - Job role to filter
 * @param {number} [params.count=10] - Number of contacts to return
 * @param {string} [params.department] - Department to filter
 * @param {string} [params.seniority] - Seniority level to filter
 * @returns {Promise<Object>} Search results with contacts
 */
const executeContactSearch = async (params) => {
  try {
    const { company, role, count = 10, department, seniority } = params;

    // Validate required parameter
    if (!company) {
      return {
        success: false,
        error: 'Company parameter is required',
        contacts: []
      };
    }

    // Normalize company to domain format
    let domain = company.toLowerCase().trim();
    if (!domain.includes('.')) {
      domain = `${domain}.com`;
    }

    // Build search query string for re-ranking context
    const queryParts = [];
    if (role) queryParts.push(role);
    if (department) queryParts.push(department);
    if (seniority) queryParts.push(seniority);
    queryParts.push(`at ${company}`);
    const queryContext = queryParts.join(' ');

    console.log(`🔧 [SearchTool] Executing search:`, {
      domain,
      role,
      count,
      department,
      seniority,
      queryContext
    });

    // Determine search strategy based on parameters
    let searchResult;

    if (department) {
      // Department-specific search
      console.log(`🔍 [SearchTool] Searching by department: ${department} at ${domain}`);
      searchResult = await hunterWithSummariesService.getContactsByDepartmentWithSummaries(
        domain,
        department,
        count,
        { query: queryContext }
      );
    } else if (seniority) {
      // Seniority-specific search
      console.log(`🔍 [SearchTool] Searching by seniority: ${seniority} at ${domain}`);
      searchResult = await hunterWithSummariesService.getContactsBySeniorityWithSummaries(
        domain,
        seniority,
        count,
        { query: queryContext }
      );
    } else {
      // General company search
      console.log(`🔍 [SearchTool] Searching company: ${domain}`);
      searchResult = await hunterWithSummariesService.getCompanyContactsWithSummaries(
        domain,
        count,
        { query: queryContext }
      );
    }

    // Handle search failure
    if (!searchResult.success) {
      console.error(`❌ [SearchTool] Search failed:`, searchResult.error);
      return {
        success: false,
        error: searchResult.error || 'Failed to search contacts',
        contacts: [],
        searchParams: params
      };
    }

    // Extract contacts from result (handle different data structures)
    const contacts = Array.isArray(searchResult.data)
      ? searchResult.data
      : (searchResult.data?.contacts || []);

    console.log(`✅ [SearchTool] Found ${contacts.length} contacts`);

    // Return structured result for AI Agent
    return {
      success: true,
      contacts: contacts.map(contact => ({
        name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        email: contact.email || contact.value,
        position: contact.position || contact.role || 'Unknown',
        department: contact.department || null,
        seniority: contact.seniority || null,
        company: contact.company || domain,
        confidence: contact.confidence || 0,
        verified: contact.verified || false,
        linkedin: contact.linkedin || null,
        summary: contact.summary || null,
        relevanceScore: contact._relevanceScore || 0
      })),
      resultCount: contacts.length,
      searchParams: {
        company: domain,
        role,
        count,
        department,
        seniority
      },
      metadata: {
        organization: searchResult.data?.organization || null,
        domain: searchResult.data?.domain || domain
      }
    };

  } catch (error) {
    console.error(`❌ [SearchTool] Exception:`, error);
    return {
      success: false,
      error: error.message || 'Internal search error',
      contacts: [],
      searchParams: params
    };
  }
};

/**
 * Format search results for display to user
 * @param {Object} result - Search result from executeContactSearch
 * @returns {string} Formatted text summary
 */
const formatSearchResultsForDisplay = (result) => {
  if (!result.success) {
    return `Search failed: ${result.error}`;
  }

  if (result.contacts.length === 0) {
    return `No contacts found for the specified criteria.`;
  }

  const lines = [
    `Found ${result.resultCount} contacts at ${result.metadata?.organization || result.searchParams?.company}:`,
    ''
  ];

  result.contacts.slice(0, 10).forEach((contact, index) => {
    lines.push(`${index + 1}. **${contact.name}**`);
    lines.push(`   - Position: ${contact.position}`);
    lines.push(`   - Email: ${contact.email}`);
    if (contact.department) lines.push(`   - Department: ${contact.department}`);
    if (contact.summary) lines.push(`   - Summary: ${contact.summary}`);
    lines.push('');
  });

  if (result.contacts.length > 10) {
    lines.push(`... and ${result.contacts.length - 10} more contacts.`);
  }

  return lines.join('\n');
};

module.exports = {
  CONTACTS_TOOL_DEFINITION,
  executeContactSearch,
  formatSearchResultsForDisplay
};


