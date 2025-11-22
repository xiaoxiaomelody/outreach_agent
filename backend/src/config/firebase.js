/**
 * Firebase Admin SDK Configuration
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In production on Cloud Run, this automatically uses Application Default Credentials
function initializeFirebase() {
  if (!admin.apps.length) {
    // Skip Firebase in dev mode for local testing
    if (process.env.DEV_MODE === 'true') {
      console.log('🔧 DEV_MODE enabled: Skipping Firebase initialization');
      return null;
    }
    
    try {
      admin.initializeApp();
      console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      console.log('💡 Tip: Set DEV_MODE=true in .env for local development without Firebase');
      throw error;
    }
  }
  return admin;
}

// Get Firestore instance
function getFirestore() {
  if (process.env.DEV_MODE === 'true') {
    return null;
  }
  return admin.firestore();
}

// Get Auth instance
function getAuth() {
  if (process.env.DEV_MODE === 'true') {
    return null;
  }
  return admin.auth();
}

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  admin
};

