/**
 * Firebase Admin SDK Configuration
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In production on Cloud Run, this automatically uses Application Default Credentials
function initializeFirebase() {
  if (!admin.apps.length) {
    
    try {
      // Check if we have a service account file
      const fs = require('fs');
      const path = require('path');
      const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
      
      // Resolve to absolute path for clarity
      const absolutePath = path.resolve(serviceAccountPath);
      console.log('🔍 Looking for service account file at:', absolutePath);
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log('✅ Service account file found');
        // Use service account file for local development
        const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountRaw);
        
        // Verify we're using the correct service account
        console.log('📧 Service account email:', serviceAccount.client_email);
        console.log('📦 Project ID:', serviceAccount.project_id);
        
        // Fix private key formatting - ensure newlines are properly formatted
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
        });
        console.log('✅ Firebase Admin SDK initialized with service account:', serviceAccount.client_email);
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use credentials from environment variable
        const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
        });
        console.log('✅ Firebase Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS');
      } else if (process.env.FIREBASE_PROJECT_ID) {
        // Try to initialize with project ID from env
        // Note: This may not work for token verification without credentials
        // For local dev, you should use a service account file
        try {
          admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID
          });
          console.log('✅ Firebase Admin SDK initialized with project ID:', process.env.FIREBASE_PROJECT_ID);
          console.log('⚠️  Warning: Token verification may fail without credentials. Consider using a service account file.');
        } catch (initError) {
          // If initialization fails, try with Application Default Credentials
          admin.initializeApp();
          console.log('✅ Firebase Admin SDK initialized with Application Default Credentials');
        }
      } else {
        // Try default initialization (for Cloud Run/Cloud Functions)
        admin.initializeApp();
        console.log('✅ Firebase Admin SDK initialized with Application Default Credentials');
      }
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      console.log('💡 Options to fix:');
      console.log('   1. Set DEV_MODE=true in .env for local development without Firebase');
      console.log('   2. Add FIREBASE_PROJECT_ID to .env');
      console.log('   3. Add firebase-service-account.json to backend/ folder');
      console.log('   4. Set up Application Default Credentials (gcloud auth application-default login)');
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

