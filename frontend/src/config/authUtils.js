// Authentication Utility Functions
// Helper functions for Firebase Authentication

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import { auth } from "./firebase";
import { createOrUpdateUserProfile, migrateLocalStorageToFirestore } from "../services/firestore.service";

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise} Firebase user credential
 */
export const signUpWithEmail = async (email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        
        // Create user profile in Firestore
        try {
            await createOrUpdateUserProfile(userCredential.user.uid, {
                email: userCredential.user.email,
                displayName: userCredential.user.displayName,
                emailVerified: userCredential.user.emailVerified,
            });
        } catch (firestoreError) {
            console.error('Error creating user profile in Firestore:', firestoreError);
            // Don't fail signup if Firestore fails
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        // Return both code and message for better error handling
        return { 
            success: false, 
            error: error.message,
            errorCode: error.code || null
        };
    }
};

/**
 * Sign in an existing user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise} Firebase user credential
 */
export const signInWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );
        
        // Update user profile in Firestore (in case it changed)
        try {
            await createOrUpdateUserProfile(userCredential.user.uid, {
                email: userCredential.user.email,
                displayName: userCredential.user.displayName,
                emailVerified: userCredential.user.emailVerified,
            });
            
            // Migrate localStorage data if needed
            await migrateLocalStorageToFirestore(userCredential.user.uid);
        } catch (firestoreError) {
            console.error('Error updating user profile in Firestore:', firestoreError);
            // Don't fail signin if Firestore fails
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        // Return both code and message for better error handling
        return { 
            success: false, 
            error: error.message,
            errorCode: error.code || null
        };
    }
};

/**
 * Sign in with Google OAuth
 * @returns {Promise} Google user credential
 */
export const signInWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        // Add scopes for Gmail if needed later
        provider.addScope('https://www.googleapis.com/auth/userinfo.email');
        provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
        
        const userCredential = await signInWithPopup(auth, provider);
        
        // Create/update user profile in Firestore
        try {
            await createOrUpdateUserProfile(userCredential.user.uid, {
                email: userCredential.user.email,
                displayName: userCredential.user.displayName,
                photoURL: userCredential.user.photoURL,
                emailVerified: userCredential.user.emailVerified,
            });
            
            // Migrate localStorage data if needed
            await migrateLocalStorageToFirestore(userCredential.user.uid);
        } catch (firestoreError) {
            console.error('Error creating user profile in Firestore:', firestoreError);
            // Don't fail signin if Firestore fails
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Google sign-in error:', error);
        // Return both code and message for better error handling
        return { 
            success: false, 
            error: error.message,
            errorCode: error.code || null
        };
    }
};

/**
 * Demo login for when Firebase is not configured
 * This allows students to test the UI before Firebase setup
 * @returns {Promise} Demo user credential
 */
export const demoLogin = async (email, password) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                isDemoMode: true,
                user: {
                    uid: "demo-user-" + Date.now(),
                    email: email,
                    emailVerified: false,
                    metadata: {
                        creationTime: new Date().toISOString(),
                        lastSignInTime: new Date().toISOString(),
                    },
                },
            });
        }, 500);
    });
};

/**
 * Sign out the current user
 * @returns {Promise} Sign out result
 */
export const logOut = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Set up an authentication state observer
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Get the current authenticated user
 * @returns {Object|null} Current user or null
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};
