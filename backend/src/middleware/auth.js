/**
 * Authentication Middleware
 * Verifies Firebase ID tokens for protected routes
 */

const admin = require('firebase-admin');

/**
 * Middleware to verify Firebase ID token
 * Attaches user info to req.user if valid
 * In DEV_MODE, creates a mock user for testing
 */
async function authenticateUser(req, res, next) {
  try {
    // Development mode - skip auth for local testing
    if (process.env.DEV_MODE === 'true') {
      console.log('⚠️  DEV_MODE: Skipping authentication (mock user)');
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        emailVerified: true,
        name: 'Dev User',
        picture: null,
      };
      return next();
    }

    // Production mode - verify Firebase token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 * Verifies token if present but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    if (process.env.DEV_MODE === 'true') {
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@example.com',
        emailVerified: true,
        name: 'Dev User',
        picture: null,
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
    }
  } catch (error) {
    console.warn('Optional auth failed:', error.message);
  }
  next();
}

module.exports = {
  authenticateUser,
  optionalAuth
};
