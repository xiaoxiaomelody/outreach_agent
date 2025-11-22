/**
 * Session Data Model
 * Schema definition for outreach session documents
 */

/**
 * Session schema
 * @typedef {Object} Session
 * @property {string} id - Session ID
 * @property {string} userId - ID of user who owns this session
 * @property {string} query - User's search query
 * @property {string} emailTemplate - Email template for this session
 * @property {string} status - Session status (active/completed/archived)
 * @property {number} contactCount - Number of contacts in this session
 * @property {number} acceptedCount - Number of accepted contacts
 * @property {number} emailsSent - Number of emails sent
 * @property {Date} createdAt - Created timestamp
 * @property {Date} updatedAt - Updated timestamp
 */

/**
 * Create a new session object
 */
const createSession = (data, userId) => ({
  userId,
  query: data.query || '',
  emailTemplate: data.emailTemplate || '',
  status: 'active',
  contactCount: 0,
  acceptedCount: 0,
  emailsSent: 0,
  createdAt: new Date(),
  updatedAt: new Date()
});

/**
 * Validate session data
 */
const validateSession = (session) => {
  const errors = [];
  
  if (!session.userId) errors.push('User ID is required');
  if (!session.query) errors.push('Query is required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  createSession,
  validateSession
};

