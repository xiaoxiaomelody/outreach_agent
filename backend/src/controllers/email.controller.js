/**
 * Email Controller
 * Handles email drafting and sending operations
 */

const gmailService = require('../services/gmail.service');
const openaiService = require('../services/openai.service');

/**
 * Draft personalized email for a contact
 * POST /api/emails/draft
 */
const draftEmail = async (req, res) => {
  try {
    const { recipientName, recipientPosition, recipientCompany, recipientSummary, template, senderName } = req.body;

    if (!recipientName || !template) {
      return res.status(400).json({
        error: 'recipientName and template are required'
      });
    }

    // Generate personalized email using OpenAI
    const result = await openaiService.generatePersonalizedEmail({
      recipientName,
      recipientPosition,
      recipientCompany,
      recipientSummary,
      template,
      senderName
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to draft email'
      });
    }

    // Generate subject line
    const subjectResult = await openaiService.generateSubjectLine(
      `Email to ${recipientName} at ${recipientCompany}`
    );

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

module.exports = {
  draftEmail,
  sendEmail,
  batchSendEmails
};

