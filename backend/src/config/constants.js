/**
 * Application Constants
 */

module.exports = {
  // Server
  PORT: process.env.PORT || 8080,
  
  // API Keys
  HUNTER_API_KEY: process.env.HUNTER_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // API URLs
  HUNTER_API_URL: 'https://api.hunter.io/v2',
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  
  // Rate Limits
  MAX_CONTACTS_PER_SEARCH: 100,
  DEFAULT_CONTACT_LIMIT: 10,
  
  // OpenAI
  DEFAULT_MODEL: 'gpt-4o-mini',
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  
  // Batch Processing
  SUMMARY_BATCH_SIZE: 5,
  BATCH_DELAY_MS: 200,
  
  // Timeouts
  API_TIMEOUT_MS: 30000,
};

