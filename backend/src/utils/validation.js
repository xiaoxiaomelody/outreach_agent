/**
 * Validation Utilities
 * Pure functions for validating input data
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate required fields
 */
const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  
  return {
    isValid: missing.length === 0,
    missing,
    errors: missing.map(field => `${field} is required`)
  };
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

/**
 * Validate domain format
 */
const isValidDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return false;
  
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
};

/**
 * Validate limit parameter
 */
const validateLimit = (limit, max = 100) => {
  const num = parseInt(limit);
  
  if (isNaN(num) || num < 1) return 10; // default
  if (num > max) return max;
  
  return num;
};

module.exports = {
  isValidEmail,
  validateRequiredFields,
  sanitizeString,
  isValidDomain,
  validateLimit
};

