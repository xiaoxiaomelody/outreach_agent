/**
 * NLP Search API Client (Frontend)
 * Natural language contact search interface
 */

import { apiCall } from './backend';

/**
 * Search for contacts using natural language query
 * @param {string} query - Natural language query (e.g., "Find 10 engineers at Google")
 * @returns {Promise<Object>} Search results with contacts and parsed criteria
 */
const nlpSearch = async (query) => {
  try {
    const response = await apiCall('/api/search/nlp', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('NLP search error:', error);
    return { 
      success: false, 
      error: error.message,
      suggestion: error.suggestion
    };
  }
};

/**
 * Get search suggestions
 * @param {string} partial - Partial search query
 * @returns {Promise<Object>} Search suggestions
 */
const getSuggestions = async (partial) => {
  try {
    const response = await apiCall('/api/search/suggest', {
      method: 'POST',
      body: JSON.stringify({ partial })
    });
    return { success: true, suggestions: response.suggestions };
  } catch (error) {
    console.error('Get suggestions error:', error);
    return { success: false, suggestions: [] };
  }
};

export const nlpSearchApi = {
  nlpSearch,
  getSuggestions
};

export default nlpSearchApi;
