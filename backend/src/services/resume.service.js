/**
 * Resume Parsing Service
 * Parse PDF resumes, extract text, structure with OpenAI, and save to Firestore
 */

const pdfParse = require('pdf-parse');
const axios = require('axios');
const { getFirestore } = require('../config/firebase');
const { ResumeValidator, InvalidDocumentError } = require('../validators/resume.validator');
const { vectorStoreService } = require('./vectorstore.service');

// OpenAI Configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================
// DEV_MODE In-Memory Storage
// ============================================
// When Firestore is not available (DEV_MODE), store resume data in memory
// This allows the email generation to access resume data during development
const devModeResumeStore = new Map();

/**
 * Get resume from DEV_MODE store
 * @param {string} userId - User ID
 * @returns {Object|null} Resume data or null
 */
const getDevModeResume = (userId) => {
  return devModeResumeStore.get(userId) || null;
};

/**
 * Save resume to DEV_MODE store
 * @param {string} userId - User ID
 * @param {Object} resumeData - Resume data
 */
const setDevModeResume = (userId, resumeData) => {
  devModeResumeStore.set(userId, resumeData);
  console.log(`📝 [DEV_MODE] Resume stored in memory for user: ${userId}`);
};

/**
 * System prompt for resume parsing
 */
const RESUME_PARSER_SYSTEM_PROMPT = `You are a resume parser. Extract the following JSON structure from the resume text. Also provide a 'cleanedText' field which contains the full professional resume text, formatted cleanly without headers/footers/page numbers.

You MUST return a valid JSON object with this exact structure:
{
  "fullName": "String - The person's full name",
  "currentRole": "String - Current or most recent job title",
  "yearsOfExperience": "Number - Estimated total years of professional experience",
  "skills": ["Array of normalized skill strings"],
  "summary": "String - A professional summary in 2-3 sentences max",
  "experiences": [
    {
      "company": "String - Company name",
      "role": "String - Job title",
      "highlights": "String - Key achievements or responsibilities"
    }
  ],
  "cleanedText": "String - The full clean text for future vectorization"
}

Guidelines:
- Normalize skills to common industry terms (e.g., "JavaScript" not "JS", "React.js" not "reactjs")
- For yearsOfExperience, calculate from work history dates if available, or estimate from context
- Keep summary concise and professional
- For experiences, include the 3-5 most relevant positions
- cleanedText should be a clean, readable version of the entire resume without page numbers, headers, or formatting artifacts`;

/**
 * Extract text from PDF buffer
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<Object>} Extracted text result
 */
const extractTextFromPDF = async (fileBuffer) => {
  try {
    const data = await pdfParse(fileBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: 'Unable to extract text from this PDF. It appears to be a scanned document or image-based PDF. Please upload a text-based PDF resume (one where you can select and copy the text).'
      };
    }

    return {
      success: true,
      text: data.text,
      numPages: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.error('PDF extraction error:', error.message);
    return {
      success: false,
      error: `Failed to extract text from PDF: ${error.message}`
    };
  }
};

/**
 * Parse resume text using OpenAI
 * @param {string} resumeText - Raw text from resume
 * @returns {Promise<Object>} Structured resume data
 */
const parseResumeWithAI = async (resumeText) => {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    // Truncate text if too long (to stay within token limits)
    const maxLength = 15000; // Approximately 4000 tokens
    const truncatedText = resumeText.length > maxLength 
      ? resumeText.substring(0, maxLength) + '\n\n[Text truncated due to length...]'
      : resumeText;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: RESUME_PARSER_SYSTEM_PROMPT },
          { role: 'user', content: `Parse this resume and return JSON:\n\n${truncatedText}` }
        ],
        temperature: 0.3, // Lower temperature for more consistent parsing
        max_tokens: 2000,
        response_format: { type: 'json_object' } // Ensure valid JSON output
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 60000 // 60 second timeout for longer resumes
      }
    );

    const content = response.data.choices[0].message.content;
    const parsedData = JSON.parse(content);

    // Validate required fields
    if (!parsedData.fullName) {
      throw new Error('Could not extract name from resume');
    }

    return {
      success: true,
      data: {
        fullName: parsedData.fullName || '',
        currentRole: parsedData.currentRole || '',
        yearsOfExperience: parsedData.yearsOfExperience || 0,
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        summary: parsedData.summary || '',
        experiences: Array.isArray(parsedData.experiences) ? parsedData.experiences : [],
        cleanedText: parsedData.cleanedText || truncatedText
      }
    };
  } catch (error) {
    console.error('OpenAI resume parsing error:', error.message);
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error?.message || 'OpenAI API request failed'
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Save parsed resume to Firestore (or DEV_MODE memory store)
 * @param {string} userId - User's Firebase UID
 * @param {Object} resumeData - Parsed resume data
 * @returns {Promise<Object>} Save result
 */
const saveResumeToFirestore = async (userId, resumeData) => {
  try {
    const db = getFirestore();
    
    const resumeDoc = {
      ...resumeData,
      updatedAt: new Date(),
      parsedAt: new Date()
    };

    if (!db) {
      // DEV_MODE - save to in-memory store
      setDevModeResume(userId, resumeDoc);
      console.log(`📝 [DEV_MODE] Resume saved to memory for user: ${userId}`);
      return {
        success: true,
        devMode: true,
        data: resumeDoc
      };
    }

    // Save to users/{userId}/resume document (overwrites previous resume)
    await db.collection('users').doc(userId).set(
      { resume: resumeDoc },
      { merge: true }
    );

    console.log(`✅ Resume saved for user: ${userId}`);
    
    return {
      success: true,
      data: resumeDoc
    };
  } catch (error) {
    console.error('Firestore save error:', error.message);
    return {
      success: false,
      error: `Failed to save resume: ${error.message}`
    };
  }
};

/**
 * Main function: Parse and save resume
 * @param {string} userId - User's Firebase UID
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<Object>} Complete result with parsed data
 */
const parseAndSaveResume = async (userId, fileBuffer) => {
  console.log(`📄 Starting resume parsing for user: ${userId}`);

  // Step 1: Extract text from PDF
  console.log('Step 1: Extracting text from PDF...');
  const extractResult = await extractTextFromPDF(fileBuffer);
  
  if (!extractResult.success) {
    return {
      success: false,
      error: extractResult.error,
      step: 'extraction'
    };
  }

  console.log(`✓ Extracted ${extractResult.text.length} characters from ${extractResult.numPages} pages`);

  // Step 2: Validate document (Fail-Fast)
  console.log('Step 2: Validating document...');
  const validator = new ResumeValidator();
  
  try {
    const validationResult = validator.validate(extractResult.text);
    console.log(`✓ Validation passed: ${validationResult.keywordsFound.length} resume keywords found`);
    
    if (validationResult.warnings.length > 0) {
      console.log(`⚠️ Warnings: ${validationResult.warnings.join(', ')}`);
    }
  } catch (error) {
    if (error instanceof InvalidDocumentError) {
      console.log(`✗ Validation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        step: 'validation',
        details: error.details
      };
    }
    throw error; // Re-throw unexpected errors
  }

  // Step 3: Parse with OpenAI
  console.log('Step 3: Parsing resume with AI...');
  const parseResult = await parseResumeWithAI(extractResult.text);
  
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error,
      step: 'parsing'
    };
  }

  console.log(`✓ Parsed resume for: ${parseResult.data.fullName}`);

  // Step 4: Save to Firestore
  console.log('Step 4: Saving to Firestore...');
  const saveResult = await saveResumeToFirestore(userId, parseResult.data);
  
  if (!saveResult.success) {
    return {
      success: false,
      error: saveResult.error,
      step: 'saving'
    };
  }

  // Step 5: Index to Vector Store (for RAG)
  console.log('Step 5: Indexing to vector store...');
  const indexResult = await vectorStoreService.indexDocument(
    parseResult.data.cleanedText,
    {
      docId: `resume_${userId}`,
      source: 'resume_upload',
      uploadTimestamp: new Date().toISOString(),
      userId: userId,
      fullName: parseResult.data.fullName,
      currentRole: parseResult.data.currentRole
    }
  );

  if (indexResult.success) {
    console.log(`✓ Indexed ${indexResult.chunksIndexed} chunks to vector store`);
  } else {
    // Log warning but don't fail the whole process
    console.log(`⚠️ Vector indexing warning: ${indexResult.error}`);
  }

  console.log(`✅ Resume processing complete for user: ${userId}`);

  return {
    success: true,
    data: parseResult.data,
    metadata: {
      pagesProcessed: extractResult.numPages,
      charactersExtracted: extractResult.text.length,
      devMode: saveResult.devMode || false,
      vectorIndexed: indexResult.success,
      chunksIndexed: indexResult.chunksIndexed || 0
    }
  };
};

module.exports = {
  parseAndSaveResume,
  extractTextFromPDF,
  parseResumeWithAI,
  saveResumeToFirestore,
  // DEV_MODE helpers
  getDevModeResume,
  // Re-export for convenience
  InvalidDocumentError
};

