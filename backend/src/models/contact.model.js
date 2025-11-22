/**
 * Contact Data Model
 * Schema definition for contact documents in Firestore
 */

/**
 * Contact schema
 * @typedef {Object} Contact
 * @property {string} id - Contact ID
 * @property {string} userId - ID of user who owns this contact
 * @property {string} sessionId - ID of the session this contact belongs to
 * @property {string} name - Full name
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} email - Email address
 * @property {string} company - Company name
 * @property {string} position - Job title
 * @property {string} department - Department (it, sales, marketing, etc.)
 * @property {string} seniority - Seniority level (junior, senior, executive)
 * @property {string} location - Location
 * @property {string} summary - AI-generated summary
 * @property {string} linkedin - LinkedIn profile URL
 * @property {string} twitter - Twitter handle
 * @property {number} confidence - Confidence score (0-100)
 * @property {boolean} verified - Email verification status
 * @property {string} verificationDate - Date email was verified
 * @property {string} source - Data source (hunter.io)
 * @property {string} status - Status (pending/accepted/rejected)
 * @property {number} relevanceScore - Relevance score for sorting
 * @property {Date} createdAt - Created timestamp
 * @property {Date} updatedAt - Updated timestamp
 */

/**
 * Create a new contact object
 */
const createContact = (data, userId, sessionId) => ({
  userId,
  sessionId,
  name: data.name || '',
  firstName: data.firstName || '',
  lastName: data.lastName || '',
  email: data.email || '',
  company: data.company || '',
  position: data.position || '',
  department: data.department || '',
  seniority: data.seniority || '',
  location: data.location || '',
  summary: data.summary || '',
  linkedin: data.linkedin || null,
  twitter: data.twitter || null,
  confidence: data.confidence || 0,
  verified: data.verified || false,
  verificationDate: data.verificationDate || null,
  source: data.source || 'hunter.io',
  status: 'pending',
  relevanceScore: data.relevanceScore || 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

/**
 * Validate contact data
 */
const validateContact = (contact) => {
  const errors = [];
  
  if (!contact.email) errors.push('Email is required');
  if (!contact.company) errors.push('Company is required');
  if (!contact.userId) errors.push('User ID is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  createContact,
  validateContact
};

