/**
 * Gmail Service
 * Send emails through user's Gmail account using OAuth2
 */

const { google } = require('googleapis');
const { getFirestore } = require('../config/firebase');

// Gmail API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;

// Validate OAuth configuration on startup
if (process.env.DEV_MODE !== 'true') {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GMAIL_REDIRECT_URI) {
    console.warn('⚠️  Warning: Gmail OAuth environment variables not fully configured');
    console.warn('   Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REDIRECT_URI');
  } else {
    console.log('✅ Gmail OAuth configuration loaded');
  }
}

/**
 * Create OAuth2 client
 */
const createOAuth2Client = () => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );
  
  // Explicitly disable Application Default Credentials
  // We only want to use OAuth2 credentials
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
      console.log('📧 [OAUTH] Refresh token received');
    }
  });
  
  return oauth2Client;
};

/**
 * Generate Gmail OAuth URL for user to authorize
 * @param {string} userId - User ID to store in state
 * @returns {string} Authorization URL
 */
const getAuthUrl = (userId) => {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass userId in state to identify user after redirect
    prompt: 'consent' // Force consent screen to get refresh token
  });

  return authUrl;
};

/**
 * Handle OAuth callback and exchange code for tokens
 * @param {string} code - Authorization code from Google
 * @param {string} userId - User ID from state parameter
 * @returns {Promise<Object>} Token information
 */
const handleOAuthCallback = async (code, userId) => {
  try {
    console.log(`📧 [OAUTH CALLBACK] Starting OAuth callback for userId: ${userId}`);
    
    // Validate environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GMAIL_REDIRECT_URI) {
      const missing = [];
      if (!GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
      if (!GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
      if (!GMAIL_REDIRECT_URI) missing.push('GMAIL_REDIRECT_URI');
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log(`📧 [OAUTH CALLBACK] OAuth config:`, {
      hasClientId: !!GOOGLE_CLIENT_ID,
      hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      redirectUri: GMAIL_REDIRECT_URI
    });
    
    const oauth2Client = createOAuth2Client();
    
    // Exchange authorization code for tokens
    console.log(`📧 [OAUTH CALLBACK] Exchanging code for tokens...`);
    let tokens;
    try {
      const tokenResponse = await oauth2Client.getToken(code);
      tokens = tokenResponse.tokens;
      console.log(`✅ [OAUTH CALLBACK] Tokens obtained successfully`);
    } catch (tokenError) {
      console.error(`❌ [OAUTH CALLBACK] Token exchange failed:`, tokenError.message);
      console.error(`❌ [OAUTH CALLBACK] Error details:`, {
        code: tokenError.code,
        response: tokenError.response?.data
      });
      throw new Error(`Failed to exchange authorization code: ${tokenError.message}`);
    }
    
    oauth2Client.setCredentials(tokens);
    console.log(`✅ [OAUTH CALLBACK] Credentials set on OAuth client`);

    // Get user's Gmail address
    console.log(`📧 [OAUTH CALLBACK] Getting Gmail profile...`);
    let profile;
    let gmailEmail;
    
    try {
      // Create Gmail client with explicit OAuth2 credentials
      // Make sure we're using the oauth2Client, not default credentials
      const gmail = google.gmail({ 
        version: 'v1', 
        auth: oauth2Client  // Explicitly use OAuth2 client, not default credentials
      });
      
      profile = await gmail.users.getProfile({ userId: 'me' });
      gmailEmail = profile.data.emailAddress;
      console.log(`✅ [OAUTH CALLBACK] Gmail profile obtained: ${gmailEmail}`);
    } catch (profileError) {
      console.error(`❌ [OAUTH CALLBACK] Failed to get Gmail profile:`, profileError.message);
      console.error(`❌ [OAUTH CALLBACK] Error details:`, {
        code: profileError.code,
        message: profileError.message,
        response: profileError.response?.data
      });
      
      // If profile fetch fails, we can't proceed without an email
      // The error message should help debug
      throw new Error(`Failed to get Gmail profile. This might be due to missing credentials. Error: ${profileError.message}`);
    }

    // Store tokens in Firestore (in production)
    if (process.env.DEV_MODE !== 'true') {
      const db = getFirestore();
      if (!db) {
        console.error('❌ [OAUTH CALLBACK] Firestore not initialized. Cannot store Gmail tokens.');
        throw new Error('Database not available. Please check Firebase configuration.');
      }
      
      console.log(`📧 [OAUTH CALLBACK] Storing tokens in Firestore for userId: ${userId}`);
      
      // Get existing user data to preserve other fields
      const userRef = db.collection('users').doc(userId);
      const existingDoc = await userRef.get();
      const existingData = existingDoc.exists ? existingDoc.data() : {};
      
      // Only update Gmail-related fields, preserve everything else
      const userData = {
        ...existingData, // Preserve all existing fields
        gmailConnected: true,
        gmailEmail: gmailEmail || profile?.data?.emailAddress,
        gmailTokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          updatedAt: new Date()
        },
        updatedAt: new Date()
      };
      
      // Initialize missing fields if this is a new document
      if (!existingDoc.exists) {
        userData.email = userData.email || '';
        userData.displayName = userData.displayName || '';
        userData.contacts = userData.contacts || {
          shortlist: [],
          sent: [],
          trash: []
        };
        userData.templates = userData.templates || [];
        userData.profile = userData.profile || {
          name: '',
          email: userData.gmailEmail || '',
          school: '',
          industries: [],
          bio: ''
        };
        userData.behavior = userData.behavior || {
          searchHistory: [],
          acceptedContacts: [],
          rejectedContacts: [],
          lastActivity: null
        };
        userData.createdAt = userData.createdAt || new Date();
      }
      
      await userRef.set(userData, { merge: true });
      console.log(`✅ [OAUTH CALLBACK] Gmail tokens stored in Firestore for user ${userId}`);
      console.log(`📧 [OAUTH CALLBACK] Connected Gmail: ${profile.data.emailAddress}`);
      
      // Verify the data was saved
      console.log(`📧 [OAUTH CALLBACK] Verifying data was saved...`);
      const verifyDoc = await db.collection('users').doc(userId).get();
      if (verifyDoc.exists) {
        const savedData = verifyDoc.data();
        console.log(`📧 [OAUTH CALLBACK] Document exists. Data:`, {
          gmailConnected: savedData.gmailConnected,
          gmailEmail: savedData.gmailEmail,
          hasTokens: !!savedData.gmailTokens,
          hasAccessToken: !!savedData.gmailTokens?.accessToken
        });
        
        if (savedData.gmailConnected && savedData.gmailTokens?.accessToken) {
          console.log(`✅ [OAUTH CALLBACK] Verified: Gmail connection saved successfully for ${userId}`);
        } else {
          console.warn(`⚠️ [OAUTH CALLBACK] Warning: Gmail connection data incomplete for ${userId}`);
        }
      } else {
        console.error(`❌ [OAUTH CALLBACK] ERROR: Document does not exist after save for ${userId}`);
      }
    }

    return {
      success: true,
      data: {
        email: profile.data.emailAddress,
        connected: true
      }
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get stored Gmail tokens for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Tokens
 */
const getUserTokens = async (userId) => {
  try {
    // In DEV_MODE, return mock tokens
    if (process.env.DEV_MODE === 'true') {
      return null;
    }

    const db = getFirestore();
    if (!db) {
      console.error('❌ Firestore not initialized. Check Firebase configuration.');
      return null;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || !userDoc.data().gmailTokens) {
      return null;
    }

    return userDoc.data().gmailTokens;
  } catch (error) {
    console.error('❌ Get user tokens error:', error.message);
    if (error.code === 16 || error.message.includes('UNAUTHENTICATED')) {
      console.error('💡 Firestore authentication error. Possible causes:');
      console.error('   1. Firestore is not enabled in your Firebase project');
      console.error('   2. Service account lacks Firestore permissions');
      console.error('   3. Service account credentials are invalid');
      console.error('   → Go to Firebase Console > Firestore Database and enable it');
      console.error('   → Ensure service account has "Cloud Datastore User" role');
    }
    return null;
  }
};

/**
 * Refresh access token if expired
 * @param {Object} tokens - Current tokens
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated tokens
 */
const refreshAccessToken = async (tokens, userId) => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update tokens in Firestore
    if (process.env.DEV_MODE !== 'true') {
      const db = getFirestore();
      await db.collection('users').doc(userId).update({
        'gmailTokens.accessToken': credentials.access_token,
        'gmailTokens.expiryDate': credentials.expiry_date,
        'gmailTokens.updatedAt': new Date()
      });
    }

    return {
      ...tokens,
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date
    };
  } catch (error) {
    console.error('❌ [TOKEN REFRESH] Token refresh error:', error.message);
    
    // If refresh token is invalid, clear stored tokens
    if (error.message && error.message.includes('invalid_grant')) {
      console.error('❌ [TOKEN REFRESH] Invalid grant - refresh token is invalid or revoked');
      console.error('❌ [TOKEN REFRESH] Clearing stored tokens for user:', userId);
      
      // Clear tokens in Firestore
      if (process.env.DEV_MODE !== 'true') {
        try {
          const db = getFirestore();
          await db.collection('users').doc(userId).update({
            'gmailTokens': null,
            'gmailConnected': false,
            'gmailEmail': null
          });
          console.log('✅ [TOKEN REFRESH] Cleared invalid tokens from Firestore');
        } catch (dbError) {
          console.error('❌ [TOKEN REFRESH] Failed to clear tokens:', dbError.message);
        }
      }
      
      throw new Error('Gmail access has been revoked or expired. Please reconnect your Gmail account in Settings.');
    }
    
    throw error;
  }
};

/**
 * Get authenticated Gmail client for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Gmail API client
 */
const getGmailClient = async (userId) => {
  const tokens = await getUserTokens(userId);
  
  if (!tokens) {
    throw new Error('Gmail not connected. Please authorize first.');
  }

  const oauth2Client = createOAuth2Client();
  
  // Check if token is expired and refresh if needed
  const now = Date.now();
  if (tokens.expiryDate && now >= tokens.expiryDate) {
    try {
      const refreshedTokens = await refreshAccessToken(tokens, userId);
      oauth2Client.setCredentials({
        access_token: refreshedTokens.accessToken,
        refresh_token: refreshedTokens.refreshToken
      });
    } catch (refreshError) {
      // If refresh fails with invalid_grant, the error is already handled in refreshAccessToken
      // Re-throw with user-friendly message
      if (refreshError.message && refreshError.message.includes('invalid_grant')) {
        throw new Error('Gmail access has been revoked or expired. Please reconnect your Gmail account in Settings.');
      }
      throw refreshError;
    }
  } else {
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken
    });
  }

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

/**
 * Create email message in RFC 2822 format
 * @param {Object} email - Email details
 * @returns {string} Base64 encoded email
 */
const createEmailMessage = ({ to, subject, body, fromName }) => {
  // Note: Gmail API automatically sets the "From" field to the authenticated user's email
  // We can optionally include a display name, but Gmail will use the authenticated account
  // The From header here is mainly for display purposes in the email client
  const fromField = fromName || 'Recruitly';

  // Clean up the body - remove any subject line that might be included
  // and ensure proper HTML formatting
  let cleanBody = body;
  
  // Remove subject line if it appears in the body (common AI mistake)
  // Escape special regex characters in subject
  const escapedSubject = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const subjectPattern = new RegExp(`^\\s*[Ss]ubject\\s*:?\\s*${escapedSubject}\\s*[\\r\\n]*`, 'im');
  cleanBody = cleanBody.replace(subjectPattern, '');
  
  // Remove any standalone "Subject:" lines (case insensitive)
  cleanBody = cleanBody.replace(/^\s*[Ss]ubject\s*:?\s*.*[\r\n]+/gm, '');
    
    // Normalize whitespace
  cleanBody = body.trim();

  // Detect if body already contains HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(cleanBody);

  if (!isHtml) {
    // Plain text → HTML
    cleanBody = cleanBody
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  // Wrap in a minimal container (Gmail-style)
  cleanBody = `<div>${cleanBody}</div>`;

  const message = [
    `From: ${fromField}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    cleanBody
  ].join('\r\n');

  // Base64url encode
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
};

/**
 * Send email via Gmail API
 * @param {string} userId - User ID
 * @param {Object} emailData - Email details
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async (userId, emailData) => {
  try {
    console.log(`📧 [SEND EMAIL] Starting send email process for user ${userId}`);
    console.log(`📧 [SEND EMAIL] Email data:`, { 
      to: emailData.to, 
      subject: emailData.subject?.substring(0, 50),
      hasBody: !!emailData.body 
    });

    const { to, subject, body, fromName } = emailData;

    // Validate input
    if (!to || !subject || !body) {
      console.error(`❌ [SEND EMAIL] Missing required fields:`, { to: !!to, subject: !!subject, body: !!body });
      return {
        success: false,
        error: 'Missing required fields: to, subject, body'
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error(`❌ [SEND EMAIL] Invalid email format: ${to}`);
      return {
        success: false,
        error: `Invalid recipient email address: ${to}`
      };
    }

    // Get Gmail client (this will throw if Gmail is not connected)
    let gmail;
    try {
      console.log(`📧 [SEND EMAIL] Getting Gmail client for user ${userId}...`);
      gmail = await getGmailClient(userId);
      console.log(`✅ [SEND EMAIL] Gmail client obtained successfully`);
    } catch (error) {
      console.error(`❌ [SEND EMAIL] Failed to get Gmail client:`, error.message);
      return {
        success: false,
        error: error.message || 'Gmail not connected. Please connect your Gmail account first via Setting.'
      };
    }

    // Create and send email
    console.log(`📧 [SEND EMAIL] Creating email message...`);
    const encodedMessage = createEmailMessage({ to, subject, body, fromName });
    console.log(`✅ [SEND EMAIL] Email message encoded (length: ${encodedMessage.length})`);
    
    console.log(`📧 [SEND EMAIL] Calling Gmail API: gmail.users.messages.send()`);
    console.log(`📧 [SEND EMAIL] Request params:`, { 
      userId: 'me',
      hasRawMessage: !!encodedMessage 
    });
    
    let response;
    try {
      response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });
    } catch (gmailError) {
      // Handle invalid_grant errors from Gmail API
      if (gmailError.message && gmailError.message.includes('invalid_grant')) {
        console.error('❌ [SEND EMAIL] Invalid grant error from Gmail API');
        // Clear tokens
        try {
          const db = getFirestore();
          await db.collection('users').doc(userId).update({
            'gmailTokens': null,
            'gmailConnected': false,
            'gmailEmail': null
          });
          console.log('✅ [SEND EMAIL] Cleared invalid tokens');
        } catch (dbError) {
          console.error('❌ [SEND EMAIL] Failed to clear tokens:', dbError.message);
        }
        throw new Error('Gmail access has been revoked or expired. Please reconnect your Gmail account in Settings.');
      }
      throw gmailError;
    }

    console.log(`✅ [SEND EMAIL] Gmail API call successful!`);
    console.log(`✅ [SEND EMAIL] Response:`, { 
      messageId: response.data.id,
      threadId: response.data.threadId 
    });
    console.log(`✅ Email sent successfully to ${to} (Message ID: ${response.data.id})`);

    return {
      success: true,
      data: {
        messageId: response.data.id,
        threadId: response.data.threadId,
        to,
        subject,
        sentAt: new Date()
      }
    };
  } catch (error) {
    console.error(`❌ [SEND EMAIL] Error occurred:`, error);
    console.error(`❌ [SEND EMAIL] Error details:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 200)
    });
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
};

/**
 * Send multiple emails (batch)
 * @param {string} userId - User ID
 * @param {Array<Object>} emails - Array of email objects
 * @returns {Promise<Object>} Batch results
 */
const sendBatchEmails = async (userId, emails) => {
  try {
    const results = [];

    // Send emails one by one with delay to respect rate limits
    for (const email of emails) {
      const result = await sendEmail(userId, email);
      results.push({
        ...email,
        ...result,
        sentAt: new Date()
      });

      // Add 1 second delay between emails to avoid rate limits
      if (emails.indexOf(email) < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📧 Batch send complete: ${successful} sent, ${failed} failed`);

    return {
      success: true,
      data: {
        results,
        total: results.length,
        successful,
        failed
      }
    };
  } catch (error) {
    console.error('Batch send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if user has Gmail connected
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Connection status
 */
const getGmailStatus = async (userId) => {
  try {
    console.log(`📧 [STATUS SERVICE] Checking Gmail status for userId: ${userId}`);
    
    if (process.env.DEV_MODE === 'true') {
      console.log(`📧 [STATUS SERVICE] DEV_MODE enabled, returning false`);
      return {
        success: true,
        connected: false,
        email: null
      };
    }

    const db = getFirestore();
    if (!db) {
      console.error('❌ [STATUS SERVICE] Firestore not initialized. Cannot check Gmail status.');
      return {
        success: false,
        error: 'Database not available. Please check Firebase configuration.',
        connected: false,
        email: null
      };
    }

    console.log(`📧 [STATUS SERVICE] Querying Firestore for user document: users/${userId}`);
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`📧 [STATUS SERVICE] No user document found for ${userId}`);
      return {
        success: true,
        connected: false,
        email: null
      };
    }

    const userData = userDoc.data();
    console.log(`📧 [STATUS SERVICE] User document found. Data keys:`, Object.keys(userData));
    console.log(`📧 [STATUS SERVICE] Gmail fields:`, {
      gmailConnected: userData.gmailConnected,
      gmailEmail: userData.gmailEmail,
      hasGmailTokens: !!userData.gmailTokens,
      hasAccessToken: !!userData.gmailTokens?.accessToken
    });
    
    const isConnected = userData.gmailConnected === true && userData.gmailTokens && userData.gmailTokens.accessToken;
    
    console.log(`📧 [STATUS SERVICE] Final status for ${userId}:`, {
      connected: isConnected,
      email: userData.gmailEmail || null,
      hasTokens: !!userData.gmailTokens
    });
    
    return {
      success: true,
      connected: isConnected,
      email: userData.gmailEmail || null
    };
  } catch (error) {
    console.error('❌ [STATUS SERVICE] Get Gmail status error:', error);
    // Provide helpful error messages for common issues
    let errorMessage = error.message;
    if (error.code === 16 || error.message.includes('UNAUTHENTICATED')) {
      errorMessage = 'Firestore authentication failed. Please check:\n' +
        '1. Firestore is enabled in Firebase Console\n' +
        '2. Service account has "Cloud Datastore User" role\n' +
        '3. Service account credentials are valid';
      console.error('💡 [STATUS SERVICE] Firestore authentication error. Check Firebase Console settings.');
    }
    
    return {
      success: false,
      error: errorMessage,
      connected: false,
      email: null
    };
  }
};

/**
 * Disconnect Gmail for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Disconnect result
 */
const disconnectGmail = async (userId) => {
  try {
    if (process.env.DEV_MODE === 'true') {
      return {
        success: true,
        message: 'DEV_MODE: Gmail disconnected (mock)'
      };
    }

    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      gmailConnected: false,
      gmailEmail: null,
      gmailTokens: null
    });

    console.log(`🔌 Gmail disconnected for user ${userId}`);

    return {
      success: true,
      message: 'Gmail disconnected successfully'
    };
  } catch (error) {
    console.error('Disconnect Gmail error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  getAuthUrl,
  handleOAuthCallback,
  sendEmail,
  sendBatchEmails,
  getGmailStatus,
  disconnectGmail,
  // Export for testing
  createEmailMessage
};

