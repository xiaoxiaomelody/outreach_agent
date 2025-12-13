/**
 * Email Controller
 * Handles email drafting and sending operations
 * 
 * Includes SSE streaming endpoint for AI-powered email generation
 */

const gmailService = require('../services/gmail.service');
const openaiService = require('../services/openai.service');
const { getFirestore } = require('../config/firebase');
const { vectorStoreService } = require('../services/vectorstore.service');
const { getDevModeResume } = require('../services/resume.service');

/**
 * Draft personalized email for a contact
 * POST /api/emails/draft
 * 
 * Combines three data sources:
 * 1. User Profile (from resume) - sender's skills, experience, background
 * 2. Recipient Info (from Hunter) - recipient's name, company, position
 * 3. Template - email template to personalize
 */
const draftEmail = async (req, res) => {
  try {
    const { recipientName, recipientPosition, recipientCompany, recipientSummary, template, senderName } = req.body;
    const userId = req.user?.uid;

    if (!recipientName || !template) {
      return res.status(400).json({
        error: 'recipientName and template are required'
      });
    }

    // Fetch user's resume profile from Firestore (or DEV_MODE memory store)
    let userProfile = null;
    const db = getFirestore();
    
    if (db && userId) {
      // Production mode: fetch from Firestore
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          userProfile = userData.resume || null;
        }
      } catch (dbError) {
        console.warn('Could not fetch user profile from Firestore:', dbError.message);
      }
    } else if (userId) {
      // DEV_MODE: fetch from in-memory store
      userProfile = getDevModeResume(userId);
      if (userProfile) {
        console.log(`📝 [DEV_MODE] Loaded resume from memory for user: ${userId}`);
      }
    }
    
    // Log profile status for debugging
    if (userProfile) {
      console.log(`📧 [Draft] Using profile: ${userProfile.fullName || 'Unknown'}, Skills: ${(userProfile.skills || []).slice(0, 3).join(', ')}...`);
    } else {
      console.log(`📧 [Draft] No user profile found for userId: ${userId}`);
    }

    // Generate personalized email using OpenAI with user profile
    const result = await openaiService.generatePersonalizedEmail({
      recipientName,
      recipientPosition,
      recipientCompany,
      recipientSummary,
      template,
      senderName,
      // Add user profile data
      userProfile
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to draft email'
      });
    }

    // Generate subject line with more context
    const subjectContext = userProfile 
      ? `${userProfile.currentRole || 'Professional'} reaching out to ${recipientName} at ${recipientCompany}`
      : `Email to ${recipientName} at ${recipientCompany}`;
    
    const subjectResult = await openaiService.generateSubjectLine(subjectContext);

    res.json({
      success: true,
      data: {
        to: req.body.recipientEmail,
        subject: subjectResult.success ? subjectResult.subject : `Outreach to ${recipientName}`,
        body: result.email,
        recipientName,
        recipientCompany
      }
    });
  } catch (error) {
    console.error('Draft email error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Send a single email via Gmail
 * POST /api/emails/send
 */
const sendEmail = async (req, res) => {
  try {
    const userId = req.user?.uid || 'unknown';
    const { to, subject, body, fromName, fromEmail } = req.body;

    console.log(`📧 [CONTROLLER] POST /api/emails/send received`);
    console.log(`📧 [CONTROLLER] User ID: ${userId}`);
    console.log(`📧 [CONTROLLER] Request body:`, {
      to,
      subject: subject?.substring(0, 50),
      hasBody: !!body,
      fromName
    });

    if (!to || !subject || !body) {
      console.error(`❌ [CONTROLLER] Missing required fields`);
      return res.status(400).json({
        error: 'to, subject, and body are required'
      });
    }

    console.log(`📧 [CONTROLLER] Calling gmailService.sendEmail...`);

    const result = await gmailService.sendEmail(userId, {
      to,
      subject,
      body,
      fromName: fromName || req.user?.name || 'Outreach Agent'
    });

    console.log(`📧 [CONTROLLER] Service result:`, { 
      success: result.success,
      hasError: !!result.error 
    });

    if (!result.success) {
      console.error(`❌ [CONTROLLER] Send email failed:`, result.error);
      return res.status(500).json({
        error: result.error || 'Failed to send email'
      });
    }

    console.log(`✅ [CONTROLLER] Email sent successfully to ${to}`);

    res.json({
      success: true,
      data: result.data,
      userId
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Send email exception:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Send multiple emails (batch)
 * POST /api/emails/batch-send
 */
const batchSendEmails = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        error: 'emails array is required and must not be empty'
      });
    }

    // Validate each email has required fields
    const isValid = emails.every(email => email.to && email.subject && email.body);
    
    if (!isValid) {
      return res.status(400).json({
        error: 'Each email must have to, subject, and body'
      });
    }

    console.log(`📧 Batch sending ${emails.length} emails`);

    const result = await gmailService.sendBatchEmails(userId, emails);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to send batch emails'
      });
    }

    console.log(`✅ Batch send complete: ${result.data.successful}/${result.data.total} sent`);

    res.json({
      success: true,
      data: result.data,
      userId
    });
  } catch (error) {
    console.error('Batch send emails error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Stream AI-generated email draft using SSE
 * POST /api/emails/stream-draft
 * 
 * Prerequisites:
 * - User must be authenticated
 * - User must have uploaded and parsed a resume
 * 
 * Request Body:
 * {
 *   recipient_info: {
 *     company_name: string (required),
 *     job_title: string (required),
 *     recipient_name?: string,
 *     recipient_role?: string
 *   },
 *   tone: 'Formal' | 'Casual' | 'Confident' | 'Curious' (default: 'Formal'),
 *   template?: string,
 *   job_description?: string
 * }
 * 
 * Response: SSE stream with format: data: {"content": "..."}\n\n
 */
const streamDraft = async (req, res) => {
  const userId = req.user?.uid;
  
  // Security: Strict userId verification
  if (!userId) {
    return res.status(401).json({
      status: 'error',
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  console.log(`📧 [Stream Draft] Request from user: ${userId}`);

  // Input validation
  const { recipient_info, tone = 'Formal', template, job_description } = req.body;

  if (!recipient_info) {
    return res.status(400).json({
      status: 'error',
      error: 'recipient_info is required',
      code: 'MISSING_RECIPIENT_INFO'
    });
  }

  const { company_name, job_title, recipient_name, recipient_role } = recipient_info;

  if (!company_name) {
    return res.status(400).json({
      status: 'error',
      error: 'recipient_info.company_name is required',
      code: 'MISSING_COMPANY_NAME'
    });
  }

  if (!job_title) {
    return res.status(400).json({
      status: 'error',
      error: 'recipient_info.job_title is required',
      code: 'MISSING_JOB_TITLE'
    });
  }

  // Validate tone
  const validTones = ['Formal', 'Casual', 'Confident', 'Curious'];
  const normalizedTone = tone.charAt(0).toUpperCase() + tone.slice(1).toLowerCase();
  if (!validTones.includes(normalizedTone)) {
    return res.status(400).json({
      status: 'error',
      error: `Invalid tone. Must be one of: ${validTones.join(', ')}`,
      code: 'INVALID_TONE'
    });
  }

  try {
    // Step 1: Fetch user's structured resume profile from Firestore (or DEV_MODE memory store)
    console.log(`📧 [Stream Draft] Fetching resume profile for user: ${userId}`);
    
    let userProfile = null;
    const db = getFirestore();
    
    if (db) {
      // Production mode: fetch from Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        userProfile = userData.resume;
      }
    } else {
      // DEV_MODE: Fetch from in-memory store (actual uploaded resume)
      userProfile = getDevModeResume(userId);
      if (userProfile) {
        console.log(`📧 [Stream Draft] DEV_MODE: Loaded resume from memory`);
        console.log(`   Name: ${userProfile.fullName}, Skills: ${(userProfile.skills || []).slice(0, 3).join(', ')}...`);
      } else {
        console.log(`📧 [Stream Draft] DEV_MODE: No resume found in memory for user: ${userId}`);
      }
    }

    // Check if profile exists
    if (!userProfile) {
      return res.status(400).json({
        status: 'error',
        error: 'Please upload a valid resume in your profile first.',
        code: 'NO_RESUME_PROFILE'
      });
    }

    console.log(`📧 [Stream Draft] Profile loaded: ${userProfile.fullName || 'Anonymous'}`);

    // Step 2 (Optional): If job_description provided, retrieve relevant resume chunks
    let additionalContext = null;
    
    if (job_description && vectorStoreService) {
      console.log(`📧 [Stream Draft] Retrieving relevant resume chunks for job description`);
      try {
        const queryResult = await vectorStoreService.query(job_description, {
          topK: 3,
          filter: { userId }
        });
        
        if (queryResult.success && queryResult.results?.length > 0) {
          additionalContext = queryResult.results
            .map(r => r.metadata?.text || r.pageContent || '')
            .filter(Boolean)
            .join('\n\n---\n\n');
          console.log(`📧 [Stream Draft] Retrieved ${queryResult.results.length} relevant chunks`);
        }
      } catch (ragError) {
        console.warn(`📧 [Stream Draft] RAG retrieval failed (non-fatal):`, ragError.message);
        // Continue without additional context
      }
    }

    // Step 3: Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: 'start', message: 'Generating email draft...' })}\n\n`);

    // Step 4: Stream email generation
    const streamResult = await openaiService.streamEmailGeneration({
      userProfile,
      recipientContext: {
        companyName: company_name,
        jobTitle: job_title,
        recipientName: recipient_name,
        recipientRole: recipient_role
      },
      tone: normalizedTone,
      template,
      jobDescription: job_description,
      additionalContext
    });

    if (!streamResult.success) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamResult.error || 'Failed to start generation' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    // Parse and forward the stream
    let fullContent = '';
    
    try {
      for await (const chunk of openaiService.parseOpenAIStream(streamResult.stream)) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`);
        } else if (chunk.type === 'finish') {
          res.write(`data: ${JSON.stringify({ type: 'finish', finishReason: chunk.finishReason })}\n\n`);
        } else if (chunk.type === 'done') {
          // Stream complete
        }
      }

      // Send completion event with full content
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        fullContent,
        metadata: {
          recipient: company_name,
          tone: normalizedTone,
          profileUsed: userProfile.fullName || 'Anonymous'
        }
      })}\n\n`);

    } catch (streamError) {
      console.error(`📧 [Stream Draft] Stream processing error:`, streamError.message);
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream processing failed: ' + streamError.message })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

    console.log(`📧 [Stream Draft] Completed for ${company_name} (${fullContent.length} chars)`);

  } catch (error) {
    console.error(`❌ [Stream Draft] Error:`, error);
    
    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        status: 'error',
        error: 'Failed to generate email draft',
        code: 'INTERNAL_ERROR'
      });
    }
    
    // If already streaming, send error event
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.write(`data: [DONE]\n\n`);
    } catch (e) {
      // Response already ended
    }
    res.end();
  }
};

module.exports = {
  draftEmail,
  sendEmail,
  batchSendEmails,
  streamDraft
};

