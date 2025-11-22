/**
 * Hunter.io API Client (Frontend)
 * Interfaces with the backend Hunter MCP service
 */

import { apiCall } from './backend';

/**
 * Search for contacts using natural language query
 * @param {string} query - Natural language search query
 * @param {number} limit - Maximum number of contacts to return
 * @returns {Promise<Object>} Search results
 * 
 * @example
 * const result = await hunterApi.searchContacts(
 *   "find 10 people graduated from Brown who work in JP Morgan",
 *   10
 * );
 */
const searchContacts = async (query, limit = 10) => {
  try {
    const response = await apiCall('/api/contacts/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit })
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Search contacts error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Find email address for a specific person
 * @param {string} firstName - Person's first name
 * @param {string} lastName - Person's last name
 * @param {string} company - Company domain or name
 * @returns {Promise<Object>} Email finding results
 * 
 * @example
 * const result = await hunterApi.findEmail("John", "Doe", "example.com");
 */
const findEmail = async (firstName, lastName, company) => {
  try {
    const response = await apiCall('/api/contacts/find-email', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, company })
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Find email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Find contacts at a specific company
 * @param {string} company - Company domain or name
 * @param {number} limit - Maximum number of contacts to return
 * @returns {Promise<Object>} Company contacts
 * 
 * @example
 * const result = await hunterApi.findCompanyContacts("stripe.com", 10);
 */
const findCompanyContacts = async (company, limit = 10) => {
  try {
    const response = await apiCall('/api/contacts/company', {
      method: 'POST',
      body: JSON.stringify({ company, limit })
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Find company contacts error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Advanced search with specific criteria
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.company - Company domain or name
 * @param {string} criteria.role - Job role or title
 * @param {string} criteria.location - Location
 * @param {number} criteria.limit - Maximum number of results
 * @returns {Promise<Object>} Search results
 * 
 * @example
 * const result = await hunterApi.advancedSearch({
 *   company: "google.com",
 *   role: "software engineer",
 *   location: "San Francisco",
 *   limit: 10
 * });
 */
const advancedSearch = async ({ company, role, location, limit = 10 }) => {
  try {
    const response = await apiCall('/api/contacts/advanced-search', {
      method: 'POST',
      body: JSON.stringify({ company, role, location, limit })
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Advanced search error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify if an email address is valid and deliverable
 * @param {string} email - Email address to verify
 * @returns {Promise<Object>} Verification results
 * 
 * @example
 * const result = await hunterApi.verifyEmail("example@company.com");
 */
const verifyEmail = async (email) => {
  try {
    const response = await apiCall('/api/contacts/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Verify email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Batch find emails for multiple people
 * @param {Array<Object>} people - Array of {firstName, lastName, company}
 * @returns {Promise<Object>} Batch results
 * 
 * @example
 * const result = await hunterApi.batchFindEmails([
 *   { firstName: "John", lastName: "Doe", company: "example.com" },
 *   { firstName: "Jane", lastName: "Smith", company: "test.com" }
 * ]);
 */
const batchFindEmails = async (people) => {
  try {
    const response = await apiCall('/api/contacts/batch-find', {
      method: 'POST',
      body: JSON.stringify({ people })
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Batch find emails error:', error);
    return { success: false, error: error.message };
  }
};

// Export all functions
export const hunterApi = {
  searchContacts,
  findEmail,
  findCompanyContacts,
  advancedSearch,
  verifyEmail,
  batchFindEmails
};

// Default export
export default hunterApi;

