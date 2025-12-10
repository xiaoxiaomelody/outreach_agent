// Firebase Configuration Template
// Students: Replace these values with your Firebase project credentials

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// TODO: Replace with your Firebase project configuration
// You can find these values in your Firebase Console:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project
// 3. Go to Project Settings (gear icon)
// 4. Scroll down to "Your apps" section
// 5. Click on the web app or "Add app" if you haven't created one
// 6. Copy the configuration object

// NOTE: Vite uses import.meta.env instead of process.env
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (gracefully fail if not configured)
let app = null;
let auth = null;
let db = null;
let functions = null;

try {
    // Check if all required config values are present
    const requiredVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_APP_ID'
    ];
    
    const missingVars = requiredVars.filter(
        varName => !import.meta.env[varName]
    );
    
    if (missingVars.length > 0) {
        console.warn("⚠️ Missing Firebase environment variables:", missingVars);
        console.warn("⚠️ Firebase features will be disabled");
    } else {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        functions = getFunctions(app);
        console.log("✅ Firebase initialized successfully");
        console.log("📋 Firebase Project ID:", firebaseConfig.projectId);
        console.log("📋 Firestore database:", db ? "Initialized" : "Failed");
        console.log("📋 Firestore app:", db?.app?.name || "N/A");
    }
} catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 200)
    });
    console.warn("⚠️ Firebase features will be disabled");
}

// Export Firebase services (will be null if not configured)
export { auth, db, functions };
export default app;
