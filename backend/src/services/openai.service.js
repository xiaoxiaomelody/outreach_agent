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
 * 
 * Combines three data sources:
 * 1. User Profile (sender) - skills, experience, background from resume
 * 2. Recipient Info - name, company, position from Hunter
 * 3. Template - email template to personalize
 * 
 * @param {Object} params - Email parameters
 * @param {string} params.recipientName - Recipient's name
 * @param {string} params.recipientPosition - Recipient's position
 * @param {string} params.recipientCompany - Recipient's company
 * @param {string} params.recipientSummary - Recipient's summary
 * @param {string} params.template - Email template with variables
 * @param {string} params.senderName - Sender's name
 * @param {Object} [params.userProfile] - User's resume profile (optional)
 * @returns {Promise<Object>} Drafted email
 */
const generatePersonalizedEmail = async (params) => {
  const { userProfile } = params;
  
  // Determine sender name - prioritize resume name for consistency
  const senderFullName = userProfile?.fullName || params.senderName || 'Professional';
  
  // Build system prompt based on whether user profile is available
  let systemPrompt;
  
  if (userProfile && (userProfile.fullName || userProfile.skills || userProfile.summary)) {
    // Get experiences for richer personalization
    const experiences = Array.isArray(userProfile.experiences) 
      ? userProfile.experiences.slice(0, 2).map(exp => 
          `${exp.role} at ${exp.company}${exp.highlights ? ': ' + exp.highlights : ''}`
        ).join('; ')
      : '';

    // Enhanced prompt with user profile
    systemPrompt = `You are a professional cold email copywriter helping job seekers write compelling outreach emails.

## YOUR TASK
Personalize the email template using the sender's REAL background to create a genuine, compelling message.

## SENDER PROFILE (THIS IS WHO IS WRITING THE EMAIL)
- **Full Name**: ${senderFullName}
- **Current/Recent Role**: ${userProfile.currentRole || 'Not specified'}
- **Years of Experience**: ${userProfile.yearsOfExperience || 'Not specified'} years
- **Top Skills**: ${Array.isArray(userProfile.skills) ? userProfile.skills.slice(0, 10).join(', ') : 'Not specified'}
- **Professional Summary**: ${userProfile.summary || 'Not provided'}
${experiences ? `- **Key Experience**: ${experiences}` : ''}

## TEMPLATE STRUCTURE INSTRUCTIONS
The template may contain structure hints in format: [mention: A -> B -> C]
This means you should write paragraphs that flow through these topics IN ORDER:
- "working experience" = Talk about sender's relevant work history
- "tech stack" = Mention specific technologies/skills from the profile  
- "education" = Reference sender's educational background
- "project experience" = Describe relevant projects
- "ask whether the company has position" = End with inquiry about opportunities
- "seeking for communication opportunity" = End with request for a chat/call

## CRITICAL RULES

### 1. SIGNATURE CONSISTENCY (MOST IMPORTANT)
- The email MUST end with a signature using the sender's full name: "${senderFullName}"
- Format: "Best regards,\\n${senderFullName}"
- DO NOT leave any placeholder like [Your Name] - use the actual name

### 2. PERSONALIZATION WITH REAL DATA
- Follow the template's [mention: ...] structure hints to organize content
- Use SPECIFIC details from the sender's profile (exact skills, exact companies, exact years)
- Connect the sender's background to the recipient's company/industry

### 3. AUTHENTICITY
- NEVER invent skills, experiences, or achievements not in the sender profile
- NEVER use generic phrases - be specific with real data from the profile

### 4. FORMAT
- Return ONLY the email body (no subject line, no "Subject:" prefix)
- Keep paragraphs short (2-3 sentences each)
- Follow the greeting -> body (as per template structure) -> call-to-action -> signature flow`;
  } else {
    // Fallback to basic personalization
    systemPrompt = `You are a professional email writer. Personalize email templates by:
1. Replacing [Name]/[name] with the recipient's name
2. Replacing [Company] with their company
3. Using "${senderFullName}" as the sender's signature

IMPORTANT: 
- The email MUST be signed as "${senderFullName}"
- Return ONLY the email body content (no subject line)
- Keep it professional and concise`;
  }

  const userPrompt = `Personalize this email template:

## TEMPLATE TO PERSONALIZE:
${params.template}

## RECIPIENT (Person receiving the email):
- Name: ${params.recipientName}
- Position: ${params.recipientPosition || 'Not specified'}
- Company: ${params.recipientCompany || 'Not specified'}
- Background: ${params.recipientSummary || 'Not available'}

## INSTRUCTIONS:
1. Replace all recipient placeholders with their actual information
2. Incorporate the sender's specific skills and experience into the body
3. Sign the email as "${senderFullName}"

Generate the personalized email body now:`;

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

/**
 * Parse natural language query and extract company domain
 * @param {string} query - User's natural language input
 * @returns {Promise<Object>} Parsed query with company domain and search parameters
 */
const parseContactSearchQuery = async (query) => {
  const systemPrompt = `You are an intelligent assistant that parses natural language queries for finding business contacts.

Extract the following information from the user's query:
1. company: The company name or domain (convert to domain format like "google.com")
2. count: Number of contacts to find (default: 10)
3. role: Job role/title if specified
4. department: Department if specified (e.g., "marketing", "engineering", "sales")
5. seniority: Seniority level if specified (e.g., "executive", "senior", "junior")

Return ONLY a JSON object with these fields. Omit fields that aren't mentioned.

Examples:
- "Find 5 engineers at Google" → {"company": "google.com", "count": 5, "role": "engineer"}
- "Show me marketing people at Stripe" → {"company": "stripe.com", "department": "marketing"}
- "Get 10 senior executives from Microsoft" → {"company": "microsoft.com", "count": 10, "seniority": "senior"}
- "Find contacts at amazon.com" → {"company": "amazon.com"}`;

  const userPrompt = `Parse this query and return JSON:
"${query}"

JSON:`;

  const result = await chatCompletion(systemPrompt, userPrompt, 'gpt-4o-mini');
  
  if (result.success) {
    try {
      // Extract JSON from response (in case there's extra text)
      let jsonText = result.data.trim();
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Validate that we at least have a company
      if (!parsed.company) {
        return {
          success: false,
          error: 'Could not identify a company from your query. Please specify a company name or domain.'
        };
      }
      
      // Ensure company is in domain format
      if (!parsed.company.includes('.')) {
        parsed.company = parsed.company.toLowerCase() + '.com';
      }
      
      return {
        success: true,
        data: {
          company: parsed.company,
          count: parsed.count || 10,
          role: parsed.role,
          department: parsed.department,
          seniority: parsed.seniority,
          originalQuery: query
        }
      };
    } catch (e) {
      console.error('Failed to parse OpenAI response:', e);
      return {
        success: false,
        error: 'Failed to understand your query. Please try rephrasing.'
      };
    }
  } else {
    return {
      success: false,
      error: result.error || 'Failed to process query'
    };
  }
};

/**
 * Stream chat completion with Function Calling support
 * Returns an async generator that yields chunks
 * 
 * @param {Object} options - Chat options
 * @param {Array<Object>} options.messages - Full conversation history
 * @param {Array<Object>} [options.tools] - Tool definitions for function calling
 * @param {string} [options.model='gpt-4o-mini'] - Model to use
 * @param {number} [options.temperature=0.7] - Temperature setting
 * @param {number} [options.maxTokens=1000] - Max tokens
 * @returns {Promise<Object>} Stream response object with reader
 */
const streamChatCompletion = async (options) => {
  const {
    messages,
    tools = [],
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 1000
  } = options;

  validateConfig();

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  console.log(`🤖 [OpenAI Stream] Starting stream request with ${messages.length} messages`);
  if (tools.length > 0) {
    console.log(`🔧 [OpenAI Stream] Tools available: ${tools.map(t => t.function?.name || t.name).join(', ')}`);
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [OpenAI Stream] API error: ${response.status}`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    return {
      success: true,
      stream: response.body,
      response
    };
  } catch (error) {
    console.error(`❌ [OpenAI Stream] Request failed:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Parse SSE stream from OpenAI
 * Yields parsed chunks including tool calls
 * 
 * @param {ReadableStream} stream - Response body stream
 * @yields {Object} Parsed chunk data
 */
async function* parseOpenAIStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  // Track tool call accumulation
  let currentToolCalls = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Yield any remaining accumulated tool calls at the end (if not already yielded)
        const toolCallArray = Object.values(currentToolCalls);
        if (toolCallArray.length > 0) {
          console.log(`🔧 [OpenAI Stream] Yielding ${toolCallArray.length} tool calls at stream end`);
          yield {
            type: 'tool_calls_complete',
            toolCalls: toolCallArray
          };
        }
        yield { type: 'done' };
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') {
          if (trimmed === 'data: [DONE]') {
            // Yield accumulated tool calls before done (if not already yielded)
            const toolCallArray = Object.values(currentToolCalls);
            if (toolCallArray.length > 0) {
              console.log(`🔧 [OpenAI Stream] Yielding ${toolCallArray.length} tool calls at [DONE]`);
              yield {
                type: 'tool_calls_complete',
                toolCalls: toolCallArray
              };
              currentToolCalls = {}; // Clear to prevent duplicate
            }
          }
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const choice = json.choices?.[0];
            
            if (!choice) continue;

            const delta = choice.delta || {};
            
            // Handle content chunks
            if (delta.content) {
              yield {
                type: 'content',
                content: delta.content
              };
            }

            // Handle tool calls (streamed in parts)
            if (delta.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;
                
                if (!currentToolCalls[index]) {
                  currentToolCalls[index] = {
                    id: toolCallDelta.id || '',
                    type: 'function',
                    function: {
                      name: '',
                      arguments: ''
                    }
                  };
                }

                if (toolCallDelta.id) {
                  currentToolCalls[index].id = toolCallDelta.id;
                }
                if (toolCallDelta.function?.name) {
                  currentToolCalls[index].function.name = toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  currentToolCalls[index].function.arguments += toolCallDelta.function.arguments;
                }
              }
            }

            // Handle finish reason
            if (choice.finish_reason) {
              // Yield tool calls BEFORE finish if we have them
              const toolCallArray = Object.values(currentToolCalls);
              if (toolCallArray.length > 0 && choice.finish_reason === 'tool_calls') {
                console.log(`🔧 [OpenAI Stream] Yielding ${toolCallArray.length} tool calls before finish`);
                yield {
                  type: 'tool_calls_complete',
                  toolCalls: toolCallArray
                };
                currentToolCalls = {}; // Clear to prevent duplicate yield
              }
              
              yield {
                type: 'finish',
                finishReason: choice.finish_reason
              };
            }
          } catch (parseError) {
            console.warn(`⚠️ [OpenAI Stream] Parse error:`, parseError.message);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Non-streaming chat completion with tools support
 * Used for tool result submission
 * 
 * @param {Object} options - Chat options
 * @param {Array<Object>} options.messages - Conversation messages including tool results
 * @param {Array<Object>} [options.tools] - Tool definitions
 * @param {string} [options.model='gpt-4o-mini'] - Model to use
 * @returns {Promise<Object>} Completion result
 */
const chatCompletionWithTools = async (options) => {
  const {
    messages,
    tools = [],
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 1000
  } = options;

  validateConfig();

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 60000
      }
    );

    const choice = response.data.choices?.[0];
    const message = choice?.message;

    return {
      success: true,
      message,
      finishReason: choice?.finish_reason,
      usage: response.data.usage
    };
  } catch (error) {
    console.error('❌ [OpenAI] chatCompletionWithTools error:', error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

// ============================================
// EMAIL GENERATION PROMPTS
// ============================================

/**
 * System prompt for professional email copywriter
 */
const EMAIL_COPYWRITER_SYSTEM_PROMPT = `You are a Professional Cold Email Copywriter and Career Coach.

Your task is to write compelling, personalized cold outreach emails that connect a job candidate's specific qualifications to a target company or role.

## Core Principles:
1. **Be Specific**: Reference actual skills and experiences from the candidate's profile
2. **No Hallucination**: NEVER invent skills, experiences, or qualifications not present in the provided profile
3. **Be Concise**: Keep emails under 200 words - busy professionals skim
4. **Show Value**: Focus on what the candidate can contribute, not what they want
5. **Call to Action**: End with a clear, low-commitment ask (e.g., "15-minute call")

## Template Structure Instructions:
Templates may contain structure hints in format: [mention: A -> B -> C]
This tells you the content flow to follow IN ORDER. Interpret these keywords:
- "working experience" = Discuss the candidate's relevant work history
- "tech stack" = Mention specific technologies and technical skills
- "education" = Reference educational background and degrees
- "project experience" = Describe notable projects with impact
- "ask whether the company has position" = Inquire about job openings
- "seeking for communication opportunity" = Request a brief call or meeting

## Email Structure (default if no template hints):
1. **Hook** (1 sentence): Personalized opener referencing the recipient or company
2. **Value Prop** (2-3 sentences): Connect candidate's specific skills to the target's needs  
3. **Social Proof** (1-2 sentences): Brief mention of relevant achievements
4. **CTA** (1 sentence): Clear, specific next step
5. **Signature**: Always end with "Best regards," followed by the candidate's FULL NAME

## Tone Guidelines:
- "Formal": Professional, respectful, traditional business language
- "Casual": Friendly, conversational, still professional
- "Confident": Bold, direct, assertive but not arrogant
- "Curious": Question-led, shows genuine interest in the company

## Output Format:
- Return the email body content
- NO subject line, NO "Subject:" prefix
- ALWAYS include signature with the candidate's actual name (from profile)
- Format signature as: "Best regards,\\n[Candidate's Full Name]"`;

/**
 * Stream email generation with user profile and recipient context
 * 
 * @param {Object} options - Generation options
 * @param {Object} options.userProfile - Structured user profile from resume parsing
 * @param {Object} options.recipientContext - Information about the recipient
 * @param {string} options.recipientContext.companyName - Target company
 * @param {string} options.recipientContext.jobTitle - Target role/position
 * @param {string} [options.recipientContext.recipientName] - Recipient's name if known
 * @param {string} [options.recipientContext.recipientRole] - Recipient's role
 * @param {string} [options.tone='Formal'] - Email tone
 * @param {string} [options.template] - Optional template to customize
 * @param {string} [options.jobDescription] - Optional job description for context
 * @param {string} [options.additionalContext] - Additional RAG-retrieved context
 * @returns {Promise<Object>} Stream response
 */
const streamEmailGeneration = async (options) => {
  const {
    userProfile,
    recipientContext,
    tone = 'Formal',
    template,
    jobDescription,
    additionalContext
  } = options;

  // Construct user prompt with all context
  let userPrompt = `## Candidate Profile:
**Name**: ${userProfile.fullName || 'Not provided'}
**Current Role**: ${userProfile.currentRole || 'Not specified'}
**Years of Experience**: ${userProfile.yearsOfExperience || 'Not specified'}

**Summary**: 
${userProfile.summary || 'No summary available'}

**Top Skills**: 
${Array.isArray(userProfile.skills) ? userProfile.skills.slice(0, 10).join(', ') : userProfile.top_skills || 'Not specified'}

**Key Experiences**:
${Array.isArray(userProfile.experiences) 
  ? userProfile.experiences.slice(0, 3).map(exp => 
      `- ${exp.role} at ${exp.company}: ${exp.highlights || 'N/A'}`
    ).join('\n')
  : 'Not specified'}

## Target Recipient:
**Company**: ${recipientContext.companyName || 'Not specified'}
**Target Role/Position**: ${recipientContext.jobTitle || 'General inquiry'}
${recipientContext.recipientName ? `**Recipient Name**: ${recipientContext.recipientName}` : ''}
${recipientContext.recipientRole ? `**Recipient's Role**: ${recipientContext.recipientRole}` : ''}

## Tone: ${tone}
`;

  // Add job description if provided
  if (jobDescription) {
    userPrompt += `
## Job Description Context:
${jobDescription.substring(0, 1000)}${jobDescription.length > 1000 ? '...' : ''}
`;
  }

  // Add RAG-retrieved context if provided
  if (additionalContext) {
    userPrompt += `
## Additional Relevant Context from Resume:
${additionalContext}
`;
  }

  // Add template if provided
  if (template) {
    userPrompt += `
## Template to Follow/Customize:
${template}

Please personalize this template following the structure hints (if any).
`;
  } else {
    userPrompt += `
## Task:
Write a compelling cold outreach email connecting this candidate's specific skills and experiences to the target company/role. 
Remember: Be specific, be concise, and include a clear call-to-action.
`;
  }

  // Always add signature requirement
  userPrompt += `
## IMPORTANT - Signature:
The email MUST end with a proper signature using the candidate's actual name:
"Best regards,
${userProfile.fullName || 'The Candidate'}"

Do NOT use placeholders like [Your Name] - use the REAL name from the profile.
`;

  const messages = [
    { role: 'system', content: EMAIL_COPYWRITER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];

  console.log(`📧 [Email Generation] Starting stream for ${recipientContext.companyName || 'unknown company'}`);
  console.log(`📧 [Email Generation] Profile: ${userProfile.fullName || 'Anonymous'}, Skills: ${(userProfile.skills || []).slice(0, 5).join(', ')}`);

  return streamChatCompletion({
    messages,
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 800
  });
};

module.exports = {
  chatCompletion,
  generateContactSummary,
  generateContactSummaries,
  extractSearchCriteria,
  parseContactSearchQuery,
  generatePersonalizedEmail,
  generateSubjectLine,
  validateConfig,
  // Streaming and tools support
  streamChatCompletion,
  parseOpenAIStream,
  chatCompletionWithTools,
  // Email generation
  streamEmailGeneration,
  EMAIL_COPYWRITER_SYSTEM_PROMPT
};

