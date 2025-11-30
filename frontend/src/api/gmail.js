/**
 * Gmail API Client (Frontend)
 * Interfaces with backend Gmail service
 */

import { apiCall } from './backend';

/**
 * Get Gmail OAuth URL to connect user's Gmail
 * @returns {Promise<Object>} OAuth URL
 */
const connectGmail = async () => {
  try {
    const response = await apiCall('/api/auth/gmail/connect', {
      method: 'GET'
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Connect Gmail error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get Gmail connection status
 * @returns {Promise<Object>} Connection status
 */
const getGmailStatus = async () => {
  try {
    const response = await apiCall('/api/auth/gmail/status', {
      method: 'GET'
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Get Gmail status error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Disconnect Gmail
 * @returns {Promise<Object>} Disconnect result
 */
const disconnectGmail = async () => {
  try {
    const response = await apiCall('/api/auth/gmail/disconnect', {
      method: 'POST'
    });
    return { success: true, data: response };
  } catch (error) {
    console.error('Disconnect Gmail error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Draft a personalized email
 * @param {Object} emailData - Email data with recipient info and template
 * @returns {Promise<Object>} Drafted email
 */
const draftEmail = async (emailData) => {
  try {
    const response = await apiCall('/api/emails/draft', {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Draft email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a single email via Gmail
 * @param {Object} emailData - Email data (to, subject, body, fromName)
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async (emailData) => {
  try {
    console.log('📧 [API] Calling /api/emails/send endpoint...');
    console.log('📧 [API] Request payload:', {
      to: emailData.to,
      subject: emailData.subject?.substring(0, 50),
      hasBody: !!emailData.body
    });
    
    const response = await apiCall('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
    
    console.log('✅ [API] Response received:', response);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ [API] Send email error:', error);
    console.error('❌ [API] Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    return { success: false, error: error.message };
  }
};

/**
 * Send multiple emails via Gmail (batch)
 * @param {Array<Object>} emails - Array of email objects
 * @returns {Promise<Object>} Batch send results
 */
const batchSendEmails = async (emails) => {
  try {
    const response = await apiCall('/api/emails/batch-send', {
      method: 'POST',
      body: JSON.stringify({ emails })
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Batch send emails error:', error);
    return { success: false, error: error.message };
  }
};

export const gmailApi = {
  connectGmail,
  getGmailStatus,
  disconnectGmail,
  draftEmail,
  sendEmail,
  batchSendEmails
};

export default gmailApi;

