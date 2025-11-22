/**
 * OpenAI Service
 * Generate summaries, extract keywords, and draft emails
 */

const axios = require('axios');

// Constants
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Validate API key
 */
const validateConfig = () => {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
};

/**
 * Make a chat completion request to OpenAI
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User query
 * @param {string} model - Model to use (default: gpt-4o-mini for cost efficiency)
 * @returns {Promise<Object>} API response
 */
const chatCompletion = async (systemPrompt, userPrompt, model = 'gpt-4o-mini') => {
  try {
    validateConfig();

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 30000
      }
    );

    return {
      success: true,
      data: response.data.choices[0].message.content.trim()
    };
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error?.message || 'OpenAI API request failed',
        statusCode: error.response.status
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'No response from OpenAI API server'
      };
    } else {
      return {
        success: false,
        error: error.message
      };
    }
  }
};

/**
 * Generate a summary for a contact
 * @param {Object} contact - Contact information
 * @param {string} contact.name - Full name
 * @param {string} contact.position - Job title
 * @param {string} contact.company - Company name
 * @param {string} contact.department - Department
 * @param {string} contact.seniority - Seniority level
 * @param {string} contact.linkedin - LinkedIn URL
 * @returns {Promise<Object>} Summary text
 */
const generateContactSummary = async (contact) => {
  const systemPrompt = `You are a professional contact research assistant. Generate a concise, professional 1-2 sentence summary about a person based on their professional information. Focus on their role, expertise, and value they could bring to a conversation.`;

  const userPrompt = `Generate a professional summary for:
Name: ${contact.name}
Position: ${contact.position || 'Not specified'}
Company: ${contact.company}
Department: ${contact.department || 'Not specified'}
Seniority: ${contact.seniority || 'Not specified'}
${contact.linkedin ? `LinkedIn: ${contact.linkedin}` : ''}

Summary:`;

  const result = await chatCompletion(systemPrompt, userPrompt, 'gpt-4o-mini');
  
  if (result.success) {
    return {
      success: true,
      summary: result.data
    };
  } else {
    return {
      success: false,
      summary: `${contact.name} works as ${contact.position || 'a professional'} at ${contact.company}.`,
      error: result.error
    };
  }
};

/**
 * Generate summaries for multiple contacts (batch)
 * @param {Array<Object>} contacts - Array of contact objects
 * @returns {Promise<Array<Object>>} Contacts with summaries
 */
const generateContactSummaries = async (contacts) => {
  try {
    // Process in parallel but limit concurrency to avoid rate limits
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (contact) => {
          const summaryResult = await generateContactSummary(contact);
          return {
            ...contact,
            summary: summaryResult.summary,
            summaryGenerated: summaryResult.success
          };
        })
      );
      results.push(...batchResults);
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return {
      success: true,
      contacts: results
    };
  } catch (error) {
    console.error('Batch summary generation error:', error);
    return {
      success: false,
      error: error.message,
      contacts: contacts.map(c => ({
        ...c,
        summary: `${c.name} works as ${c.position || 'a professional'} at ${c.company}.`,
        summaryGenerated: false
      }))
    };
  }
};

/**
 * Extract keywords from natural language query
 * @param {string} query - User's natural language query
 * @returns {Promise<Object>} Extracted criteria
 */
const extractSearchCriteria = async (query) => {
  const systemPrompt = `You are a search query parser. Extract structured search criteria from natural language queries. Return JSON only with these fields: company, role, department, location, count. If a field is not mentioned, omit it.`;

  const userPrompt = `Parse this search query and return JSON:
"${query}"

Example output:
{"company": "Google", "role": "engineer", "department": "it", "count": 10}

Your response (JSON only):`;

  const result = await chatCompletion(systemPrompt, userPrompt, 'gpt-4o-mini');
  
  if (result.success) {
    try {
      const criteria = JSON.parse(result.data);
      return {
        success: true,
        criteria
      };
    } catch (e) {
      return {
        success: false,
        error: 'Failed to parse criteria from response'
      };
    }
  } else {
    return {
      success: false,
      error: result.error
    };
  }
};

/**
 * Generate personalized email draft
 * @param {Object} params - Email parameters
 * @param {string} params.recipientName - Recipient's name
 * @param {string} params.recipientPosition - Recipient's position
 * @param {string} params.recipientCompany - Recipient's company
 * @param {string} params.recipientSummary - Recipient's summary
 * @param {string} params.template - Email template with variables
 * @param {string} params.senderName - Sender's name
 * @returns {Promise<Object>} Drafted email
 */
const generatePersonalizedEmail = async (params) => {
  const systemPrompt = `You are a professional email writer. Personalize email templates based on recipient information. Keep the tone professional but warm. Make specific references to the recipient's role and background.`;

  const userPrompt = `Personalize this email template:

Template:
${params.template}

Recipient Information:
- Name: ${params.recipientName}
- Position: ${params.recipientPosition}
- Company: ${params.recipientCompany}
- Summary: ${params.recipientSummary}

Sender: ${params.senderName}

Generate a personalized version of this email:`;

  const result = await chatCompletion(systemPrompt, userPrompt, 'gpt-4o-mini');
  
  if (result.success) {
    return {
      success: true,
      email: result.data
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
};

/**
 * Generate email subject line
 * @param {string} context - Context for the subject line
 * @returns {Promise<Object>} Subject line
 */
const generateSubjectLine = async (context) => {
  const systemPrompt = `You are an expert at writing engaging email subject lines. Create a subject line that is professional, engaging, and likely to get opened. Keep it under 60 characters.`;

  const userPrompt = `Generate an email subject line for: ${context}

Subject line:`;

  const result = await chatCompletion(systemPrompt, userPrompt, 'gpt-4o-mini');
  
  if (result.success) {
    return {
      success: true,
      subject: result.data.replace(/^["']|["']$/g, '') // Remove quotes if present
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
};

module.exports = {
  chatCompletion,
  generateContactSummary,
  generateContactSummaries,
  extractSearchCriteria,
  generatePersonalizedEmail,
  generateSubjectLine,
  validateConfig
};

