/**
 * Authentication Controller
 * Handles Gmail OAuth flow and authentication operations
 */

const gmailService = require('../services/gmail.service');

/**
 * Initiate Gmail OAuth flow
 * GET /api/auth/gmail/connect
 */
const initiateGmailOAuth = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Generate OAuth URL
    const authUrl = gmailService.getAuthUrl(userId);
    
    console.log(`🔗 Generated Gmail OAuth URL for user ${userId}`);
    
    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Initiate Gmail OAuth error:', error);
    res.status(500).json({
      error: error.message || 'Failed to initiate OAuth'
    });
  }
};

/**
 * Handle Gmail OAuth callback
 * GET /api/auth/gmail/callback
 */
const handleGmailCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state; // userId was passed as state parameter
    
    console.log(`📧 Gmail OAuth callback received:`, { 
      hasCode: !!code, 
      userId: userId,
      queryParams: Object.keys(req.query)
    });
    
    if (!code) {
      console.error('❌ Authorization code not provided');
      return res.status(400).send('Authorization code not provided');
    }

    if (!userId) {
      console.error('❌ User ID not found in state parameter');
      return res.status(400).send('User ID not found. Please try connecting again.');
    }

    console.log(`📧 Processing Gmail OAuth callback for user ${userId}`);

    // Exchange code for tokens
    let result;
    try {
      result = await gmailService.handleOAuthCallback(code, userId);
      
      console.log(`📧 OAuth callback result:`, { 
        success: result.success, 
        email: result.data?.email,
        error: result.error 
      });
    } catch (error) {
      console.error(`❌ [CALLBACK] Exception in handleOAuthCallback:`, error);
      console.error(`❌ [CALLBACK] Error stack:`, error.stack);
      result = {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
    
    if (result.success) {
      // Redirect to frontend with success
      res.send(`
        <html>
          <head>
            <title>Gmail Connected</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .success-box {
                background: white;
                padding: 40px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              }
              .success-icon {
                font-size: 60px;
                margin-bottom: 20px;
              }
              h1 { color: #4caf50; margin: 0 0 10px 0; }
              p { color: #666; }
              button {
                margin-top: 20px;
                padding: 12px 24px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
              }
              button:hover { background: #5568d3; }
            </style>
          </head>
          <body>
            <div class="success-box">
              <div class="success-icon">✅</div>
              <h1>Gmail Connected!</h1>
              <p>Your Gmail account (${result.data.email}) is now connected.</p>
              <p>You can now send emails through the Outreach Agent.</p>
              <button onclick="window.close()">Close this window</button>
            </div>
            <script>
              // Try multiple methods to notify parent window
              function notifyParent() {
                try {
                  // Method 1: postMessage (may be blocked by Cross-Origin-Opener-Policy)
                  if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({ 
                      type: 'GMAIL_CONNECTED', 
                      email: '${result.data.email}',
                      timestamp: Date.now()
                    }, '*');
                    console.log('✅ Sent postMessage to parent');
                  }
                } catch (e) {
                  console.warn('postMessage failed:', e);
                }
                
                // Method 2: Use localStorage as fallback (parent polls for this)
                try {
                  localStorage.setItem('gmail_connection_status', JSON.stringify({
                    connected: true,
                    email: '${result.data.email}',
                    timestamp: Date.now()
                  }));
                  console.log('✅ Saved connection status to localStorage');
                } catch (e) {
                  console.warn('localStorage failed:', e);
                }
              }
              
              // Notify immediately
              notifyParent();
              
              // Also notify after a short delay
              setTimeout(notifyParent, 500);
              
              // Auto-close after 2 seconds
              setTimeout(() => {
                try {
                  if (window.opener && !window.opener.closed) {
                    window.close();
                  } else {
                    window.location.href = 'http://localhost:3000/dashboard';
                  }
                } catch (e) {
                  window.location.href = 'http://localhost:3000/dashboard';
                }
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } else {
      const errorMessage = result.error || 'Unknown error';
      console.error(`❌ [CALLBACK] Gmail connection failed:`, errorMessage);
      
      res.status(500).send(`
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
              }
              .error-box {
                background: white;
                padding: 40px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                max-width: 500px;
              }
              .error-icon {
                font-size: 60px;
                margin-bottom: 20px;
              }
              h1 { color: #d32f2f; margin: 0 0 10px 0; }
              p { color: #666; margin: 10px 0; }
              .error-details {
                background: #ffebee;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                text-align: left;
                font-family: monospace;
                font-size: 12px;
                color: #c62828;
              }
              button {
                margin-top: 20px;
                padding: 12px 24px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
              }
              button:hover { background: #5568d3; }
            </style>
          </head>
          <body>
            <div class="error-box">
              <div class="error-icon">❌</div>
              <h1>Connection Failed</h1>
              <p>Unable to connect your Gmail account.</p>
              <div class="error-details">
                <strong>Error:</strong><br>
                ${errorMessage}
              </div>
              <p style="font-size: 14px; color: #999;">
                Please check your backend logs for more details.
              </p>
              <button onclick="window.close()">Close</button>
            </div>
            <script>
              // Try to notify parent window of failure
              try {
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'GMAIL_CONNECTION_FAILED', 
                    error: '${errorMessage.replace(/'/g, "\\'")}'
                  }, '*');
                }
              } catch (e) {
                console.error('Failed to notify parent:', e);
              }
              
              setTimeout(() => {
                try {
                  if (window.opener) {
                    window.close();
                  }
                } catch (e) {
                  // Ignore
                }
              }, 5000);
            </script>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>❌ Error</h1>
          <p>${error.message}</p>
          <button onclick="window.close()">Close</button>
        </body>
      </html>
    `);
  }
};

/**
 * Get Gmail connection status
 * GET /api/auth/gmail/status
 */
const getGmailStatus = async (req, res) => {
  try {
    const userId = req.user?.uid;
    
    console.log(`📧 [STATUS] GET /api/auth/gmail/status called`);
    console.log(`📧 [STATUS] User ID from req.user:`, userId);
    console.log(`📧 [STATUS] Full req.user:`, req.user);
    
    if (!userId) {
      console.error('❌ [STATUS] No userId found in req.user');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        connected: false,
        email: null
      });
    }
    
    const result = await gmailService.getGmailStatus(userId);
    
    console.log(`📧 [STATUS] Service returned:`, result);
    
    res.json(result);
  } catch (error) {
    console.error('❌ [STATUS] Get Gmail status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      connected: false,
      email: null
    });
  }
};

/**
 * Disconnect Gmail
 * POST /api/auth/gmail/disconnect
 */
const disconnectGmail = async (req, res) => {
  try {
    const userId = req.user.uid;
    const result = await gmailService.disconnectGmail(userId);
    
    res.json(result);
  } catch (error) {
    console.error('Disconnect Gmail error:', error);
    res.status(500).json({
      error: error.message
    });
  }
};

module.exports = {
  initiateGmailOAuth,
  handleGmailCallback,
  getGmailStatus,
  disconnectGmail
};

