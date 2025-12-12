/**
 * Firestore Service
 * Handles all Firestore database operations for user data
 */

import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

/**
 * Get user document from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User document data or null
 */
export const getUserData = async (userId) => {
  if (!db || !userId) {
    console.warn('⚠️ Firestore not initialized or userId missing', { db: !!db, userId });
    return null;
  }

  try {
    console.log('📋 Getting user data from Firestore:', userId);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      console.log('✅ User document found in Firestore');
      return data;
    } else {
      console.log('📋 User document does not exist yet in Firestore');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 200)
    });
    throw error;
  }
};

/**
 * Create or update user profile in Firestore
 * @param {string} userId - User ID
 * @param {Object} userData - User data (email, displayName, etc.)
 * @returns {Promise<void>}
 */
export const createOrUpdateUserProfile = async (userId, userData) => {
  if (!db || !userId) {
    console.warn('⚠️ Firestore not initialized or userId missing', { db: !!db, userId });
    return;
  }

  try {
    console.log('📋 Creating/updating user profile:', { userId, email: userData.email });
    const userRef = doc(db, 'users', userId);
    const existingData = await getUserData(userId);
    console.log('📋 Existing user data:', existingData ? 'Found' : 'Not found (new user)');
    
    const profileData = {
      email: userData.email || '',
      displayName: userData.displayName || userData.name || '',
      photoURL: userData.photoURL || userData.picture || '',
      emailVerified: userData.emailVerified || false,
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Initialize empty arrays if new user
      contacts: existingData?.contacts || {
        shortlist: [],
        sent: [],
        trash: [],
      },
      templates: existingData?.templates || [],
      profile: existingData?.profile || {
        name: '',
        email: userData.email || '',
        school: '',
        industries: [],
        bio: '',
        resumeName: '',
        resumeData: '',
      },
      behavior: existingData?.behavior || {
        searchHistory: [],
        acceptedContacts: [],
        rejectedContacts: [],
        lastActivity: null,
      },
      emailDrafts: existingData?.emailDrafts || {},
      // Initialize searchHistory field for new users
      searchHistory: existingData?.searchHistory || [],
    };

    console.log('📋 Writing user profile to Firestore...');
    console.log('📋 Profile data structure:', {
      hasEmail: !!profileData.email,
      hasContacts: !!profileData.contacts,
      hasTemplates: !!profileData.templates,
      hasProfile: !!profileData.profile,
      hasBehavior: !!profileData.behavior,
      contactsShortlistCount: profileData.contacts?.shortlist?.length || 0
    });
    
    await setDoc(userRef, profileData, { merge: true });
    console.log('✅ User profile created/updated in Firestore successfully');
    
    // Verify it was written with all fields
    const verifyData = await getUserData(userId);
    if (verifyData) {
      console.log('✅ Verified: User document exists in Firestore');
      console.log('✅ Document fields:', {
        hasEmail: !!verifyData.email,
        hasContacts: !!verifyData.contacts,
        hasTemplates: !!verifyData.templates,
        hasProfile: !!verifyData.profile,
        hasBehavior: !!verifyData.behavior,
        hasGmailConnected: !!verifyData.gmailConnected,
        contactsShortlistCount: verifyData.contacts?.shortlist?.length || 0
      });
    } else {
      console.warn('⚠️ Warning: Could not verify user document was created');
    }
  } catch (error) {
    console.error('❌ Error creating/updating user profile:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 200)
    });
    throw error;
  }
};

/**
 * Get user contacts (shortlist, sent, trash)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Contacts object with shortlist, sent, trash arrays
 */
export const getUserContacts = async (userId) => {
  if (!db || !userId) {
    console.warn('Firestore not initialized or userId missing');
    return { shortlist: [], sent: [], trash: [] };
  }

  try {
    const userData = await getUserData(userId);
    return userData?.contacts || { shortlist: [], sent: [], trash: [] };
  } catch (error) {
    console.error('Error getting user contacts:', error);
    return { shortlist: [], sent: [], trash: [] };
  }
};

/**
 * Update user contacts
 * @param {string} userId - User ID
 * @param {Object} contacts - Contacts object with shortlist, sent, trash arrays
 * @returns {Promise<void>}
 */
export const updateUserContacts = async (userId, contacts) => {
  if (!db || !userId) {
    console.warn('⚠️ Firestore not initialized or userId missing', { db: !!db, userId });
    return;
  }

  try {
    console.log('📋 Updating contacts in Firestore:', {
      userId,
      shortlistCount: contacts.shortlist?.length || 0,
      sentCount: contacts.sent?.length || 0,
      trashCount: contacts.trash?.length || 0
    });
    
    // First, ensure user document exists
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('📋 User document does not exist, creating it first...');
      // Create user document with basic info if it doesn't exist
      await setDoc(userRef, {
        email: '',
        displayName: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        contacts: {
          shortlist: [],
          sent: [],
          trash: [],
        },
        templates: [],
        profile: {
          name: '',
          email: '',
          school: '',
          industries: [],
          bio: '',
        },
        behavior: {
          searchHistory: [],
          acceptedContacts: [],
          rejectedContacts: [],
          lastActivity: null,
        },
      }, { merge: true });
      console.log('✅ User document created');
    }
    
    // Now update contacts
    console.log('📋 ===== WRITING TO FIRESTORE =====');
    console.log('📋 Document path: users/' + userId);
    console.log('📋 Project ID:', db.app?.options?.projectId);
    console.log('📋 Contacts to write:', {
      shortlist: contacts.shortlist?.length || 0,
      sent: contacts.sent?.length || 0,
      trash: contacts.trash?.length || 0,
      shortlistFirst: contacts.shortlist?.[0]?.value || contacts.shortlist?.[0]?.email || 'none'
    });
    
    const updateData = {
      'contacts.shortlist': contacts.shortlist || [],
      'contacts.sent': contacts.sent || [],
      'contacts.trash': contacts.trash || [],
      updatedAt: serverTimestamp(),
    };
    
    console.log('📋 Calling updateDoc...');
    await updateDoc(userRef, updateData);
    console.log('✅ updateDoc promise resolved');
    
    // Wait a moment for consistency, then verify
    console.log('📋 Waiting 500ms for consistency...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the update immediately
    console.log('📋 Verifying write by reading document...');
    const verifySnap = await getDoc(userRef);
    
    if (verifySnap.exists()) {
      const verifyData = verifySnap.data();
      const actualContacts = verifyData.contacts || {};
      console.log('✅ ===== VERIFICATION SUCCESSFUL =====');
      console.log('✅ Document exists in Firestore');
      console.log('✅ Contacts in Firestore:', {
        shortlistCount: actualContacts.shortlist?.length || 0,
        sentCount: actualContacts.sent?.length || 0,
        trashCount: actualContacts.trash?.length || 0,
        shortlistFirst: actualContacts.shortlist?.[0]?.value || actualContacts.shortlist?.[0]?.email || 'none'
      });
      console.log('📋 Full document path: users/' + userId);
      console.log('📋 Project: ' + (db.app?.options?.projectId || 'unknown'));
      console.log('✅ ===== END VERIFICATION =====');
    } else {
      console.error('❌ ===== VERIFICATION FAILED =====');
      console.error('❌ Document does NOT exist after update!');
      console.error('❌ This means the write failed silently');
      console.error('❌ Check Firestore security rules and permissions');
    }
  } catch (error) {
    console.error('❌ Error updating user contacts:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 200)
    });
    throw error;
  }
};

/**
 * Add contact to shortlist
 * @param {string} userId - User ID
 * @param {Object} contact - Contact object
 * @returns {Promise<boolean>} Success status
 */
export const addContactToShortlist = async (userId, contact) => {
  if (!db || !userId || !contact) {
    console.error('❌ addContactToShortlist: Missing db, userId, or contact', { db: !!db, userId, contact: !!contact });
    return false;
  }

  try {
    console.log('📋 Adding contact to shortlist:', { userId, contact: contact.value || contact.email });
    const contacts = await getUserContacts(userId);
    const emailKey = contact.value || contact.email;
    
    // Check if already exists
    const exists = contacts.shortlist.some(
      (c) => (c.value || c.email) === emailKey
    );
    if (exists) {
      console.log('⚠️ Contact already exists in shortlist');
      return false;
    }

    contacts.shortlist.push(contact);
    console.log('📋 Updating Firestore with new contact...');
    await updateUserContacts(userId, contacts);
    console.log('✅ Contact added to Firestore successfully');
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('contacts-updated'));
    
    return true;
  } catch (error) {
    console.error('❌ Error adding contact to shortlist:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Remove contact from shortlist
 * @param {string} userId - User ID
 * @param {string} emailKey - Contact email identifier
 * @returns {Promise<void>}
 */
export const removeContactFromShortlist = async (userId, emailKey) => {
  if (!db || !userId || !emailKey) return;

  try {
    const contacts = await getUserContacts(userId);
    contacts.shortlist = contacts.shortlist.filter(
      (c) => (c.value || c.email) !== emailKey
    );
    await updateUserContacts(userId, contacts);
  } catch (error) {
    console.error('Error removing contact from shortlist:', error);
    throw error;
  }
};

/**
 * Move contact to trash
 * @param {string} userId - User ID
 * @param {Object} contact - Contact object
 * @returns {Promise<void>}
 */
export const moveContactToTrash = async (userId, contact) => {
  if (!db || !userId || !contact) return;

  try {
    const contacts = await getUserContacts(userId);
    const emailKey = contact.value || contact.email;

    // Remove from shortlist and sent
    contacts.shortlist = contacts.shortlist.filter(
      (c) => (c.value || c.email) !== emailKey
    );
    contacts.sent = contacts.sent.filter(
      (c) => (c.value || c.email) !== emailKey
    );

    // Add to trash if not already there
    const existsInTrash = contacts.trash.some(
      (c) => (c.value || c.email) === emailKey
    );
    if (!existsInTrash) {
      contacts.trash.push(contact);
    }

    await updateUserContacts(userId, contacts);
  } catch (error) {
    console.error('Error moving contact to trash:', error);
    throw error;
  }
};

/**
 * Move contact to sent
 * @param {string} userId - User ID
 * @param {Object} contact - Contact object
 * @returns {Promise<void>}
 */
export const moveContactToSent = async (userId, contact) => {
  if (!db || !userId || !contact) return;

  try {
    const contacts = await getUserContacts(userId);
    const emailKey = contact.value || contact.email;

    // Remove from shortlist
    contacts.shortlist = contacts.shortlist.filter(
      (c) => (c.value || c.email) !== emailKey
    );

    // Add to sent if not already there
    const existsInSent = contacts.sent.some(
      (c) => (c.value || c.email) === emailKey
    );
    if (!existsInSent) {
      contacts.sent.push(contact);
    }

    await updateUserContacts(userId, contacts);
  } catch (error) {
    console.error('Error moving contact to sent:', error);
    throw error;
  }
};

/**
 * Restore contact from trash to shortlist
 * @param {string} userId - User ID
 * @param {Object} contact - Contact object
 * @returns {Promise<void>}
 */
export const restoreContactFromTrash = async (userId, contact) => {
  if (!db || !userId || !contact) return;

  try {
    const contacts = await getUserContacts(userId);
    const emailKey = contact.value || contact.email;

    // Remove from trash
    contacts.trash = contacts.trash.filter(
      (c) => (c.value || c.email) !== emailKey
    );

    // Add to shortlist if not already there
    const existsInShortlist = contacts.shortlist.some(
      (c) => (c.value || c.email) === emailKey
    );
    if (!existsInShortlist) {
      contacts.shortlist.push(contact);
    }

    await updateUserContacts(userId, contacts);
  } catch (error) {
    console.error('Error restoring contact from trash:', error);
    throw error;
  }
};

/**
 * Get user email templates
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of templates
 */
export const getUserTemplates = async (userId) => {
  if (!db || !userId) {
    console.warn('Firestore not initialized or userId missing');
    return [];
  }

  try {
    const userData = await getUserData(userId);
    return userData?.templates || [];
  } catch (error) {
    console.error('Error getting user templates:', error);
    return [];
  }
};

/**
 * Update user email templates
 * @param {string} userId - User ID
 * @param {Array} templates - Array of template objects
 * @returns {Promise<void>}
 */
export const updateUserTemplates = async (userId, templates) => {
  if (!db || !userId) {
    console.warn('Firestore not initialized or userId missing');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      templates: templates || [],
      updatedAt: serverTimestamp(),
    });
    console.log('✅ User templates updated in Firestore');
  } catch (error) {
    console.error('Error updating user templates:', error);
    throw error;
  }
};

/**
 * Get email drafts for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Object mapping contact email to draft { subject, body, updatedAt }
 */
export const getUserEmailDrafts = async (userId) => {
  if (!db || !userId) {
    console.warn('Firestore not initialized or userId missing');
    return {};
  }

  try {
    const userData = await getUserData(userId);
    return userData?.emailDrafts || {};
  } catch (error) {
    console.error('Error getting email drafts:', error);
    return {};
  }
};

/**
 * Save email draft for a specific contact
 * @param {string} userId - User ID
 * @param {string} contactEmail - Contact email identifier
 * @param {Object} draft - Draft object { subject, body }
 * @returns {Promise<void>}
 */
export const saveEmailDraft = async (userId, contactEmail, draft) => {
  if (!db || !userId || !contactEmail) {
    console.warn('Firestore not initialized or missing parameters');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);
    const currentDrafts = userData?.emailDrafts || {};
    
    // Update the specific draft
    const updatedDrafts = {
      ...currentDrafts,
      [contactEmail]: {
        subject: draft.subject || '',
        body: draft.body || '',
        updatedAt: new Date().toISOString()
      }
    };

    await updateDoc(userRef, {
      emailDrafts: updatedDrafts,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Email draft saved to Firestore');
  } catch (error) {
    console.error('Error saving email draft:', error);
    throw error;
  }
};

/**
 * Delete email draft for a specific contact
 * @param {string} userId - User ID
 * @param {string} contactEmail - Contact email identifier
 * @returns {Promise<void>}
 */
export const deleteEmailDraft = async (userId, contactEmail) => {
  if (!db || !userId || !contactEmail) {
    console.warn('Firestore not initialized or missing parameters');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);
    const currentDrafts = userData?.emailDrafts || {};
    
    // Remove the specific draft
    const updatedDrafts = { ...currentDrafts };
    delete updatedDrafts[contactEmail];

    await updateDoc(userRef, {
      emailDrafts: updatedDrafts,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Email draft deleted from Firestore');
  } catch (error) {
    console.error('Error deleting email draft:', error);
    throw error;
  }
};

/**
 * Get Gmail connection state from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Gmail connection state { connected: boolean, email: string }
 */
export const getGmailConnectionState = async (userId) => {
  if (!db || !userId) {
    console.warn('Firestore not initialized or userId missing');
    return { connected: false, email: '' };
  }

  try {
    const userData = await getUserData(userId);
    return {
      connected: userData?.gmailConnected || false,
      email: userData?.gmailEmail || ''
    };
  } catch (error) {
    console.error('Error getting Gmail connection state:', error);
    return { connected: false, email: '' };
  }
};

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile object
 */
export const getUserProfile = async (userId) => {
  if (!db || !userId) {
    console.warn('Firestore not initialized or userId missing');
    return {
      name: '',
      email: '',
      school: '',
      industries: [],
      bio: '',
      resumeName: '',
      resumeData: '',
    };
  }

  try {
    const userData = await getUserData(userId);
    return userData?.profile || {
      name: '',
      email: '',
      school: '',
      industries: [],
      bio: '',
      resumeName: '',
      resumeData: '',
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      name: '',
      email: '',
      school: '',
      industries: [],
      bio: '',
      resumeName: '',
      resumeData: '',
    };
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} profile - Profile object
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (userId, profile) => {
  if (!db || !userId) {
    console.warn('Firestore not initialized or userId missing');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'profile.name': profile.name || '',
      'profile.email': profile.email || '',
      'profile.school': profile.school || '',
      'profile.industries': profile.industries || [],
      'profile.bio': profile.bio || '',
      'profile.resumeName': profile.resumeName || '',
      'profile.resumeData': profile.resumeData || '',
      updatedAt: serverTimestamp(),
    });
    console.log('✅ User profile updated in Firestore');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Record user behavior (search, accept, reject)
 * @param {string} userId - User ID
 * @param {string} type - Behavior type: 'search', 'accept', 'reject'
 * @param {Object} data - Behavior data
 * @returns {Promise<void>}
 */
export const recordUserBehavior = async (userId, type, data) => {
  if (!db || !userId) return;

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);
    const behavior = userData?.behavior || {
      searchHistory: [],
      acceptedContacts: [],
      rejectedContacts: [],
      lastActivity: null,
    };

    const timestamp = new Date().toISOString();

    switch (type) {
      case 'search':
        behavior.searchHistory = [
          ...(behavior.searchHistory || []).slice(-49), // Keep last 50
          { query: data.query, timestamp, results: data.results || 0 },
        ];
        break;
      case 'accept':
        behavior.acceptedContacts = [
          ...(behavior.acceptedContacts || []).slice(-99), // Keep last 100
          { contact: data.contact, timestamp },
        ];
        break;
      case 'reject':
        behavior.rejectedContacts = [
          ...(behavior.rejectedContacts || []).slice(-99), // Keep last 100
          { contact: data.contact, timestamp },
        ];
        break;
    }

    behavior.lastActivity = timestamp;

    await updateDoc(userRef, {
      behavior,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording user behavior:', error);
    // Don't throw - behavior tracking is non-critical
  }
};

/**
 * Save search history entry with query and contacts
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {Array} contacts - Array of contact objects
 * @returns {Promise<void>}
 */
export const saveSearchHistory = async (userId, query, contacts) => {
  if (!db || !userId || !query) {
    console.warn('⚠️ Firestore not initialized or missing parameters', {
      db: !!db,
      userId: !!userId,
      query: !!query
    });
    return;
  }

  try {
    console.log('📋 Saving search history:', { userId, query: query.trim(), contactCount: contacts?.length || 0 });
    
    const userRef = doc(db, 'users', userId);
    let userSnap = await getDoc(userRef);
    let wasNewDocument = false;
    
    // Ensure user document exists before updating
    if (!userSnap.exists()) {
      console.log('📋 User document does not exist, creating it first...');
      wasNewDocument = true;
      await setDoc(userRef, {
        email: '',
        displayName: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        contacts: {
          shortlist: [],
          sent: [],
          trash: [],
        },
        templates: [],
        profile: {
          name: '',
          email: '',
          school: '',
          industries: [],
          bio: '',
        },
        behavior: {
          searchHistory: [],
          acceptedContacts: [],
          rejectedContacts: [],
          lastActivity: null,
        },
        searchHistory: [], // Initialize search history
      }, { merge: true });
      console.log('✅ User document created for search history');
      // Re-fetch the document after creating it
      userSnap = await getDoc(userRef);
    }
    
    // Get existing search history
    // If we just created the document, searchHistory will be empty array
    // Otherwise, get it from the document data
    const userData = userSnap.exists() ? userSnap.data() : null;
    const searchHistory = userData?.searchHistory || [];
    
    console.log('📋 Current search history length:', searchHistory.length);
    
    // Create new history entry
    const historyEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // More unique ID
      query: query.trim(),
      contacts: contacts || [],
      resultCount: contacts?.length || 0,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(), // Use ISO string instead of serverTimestamp()
    };
    
    // Add to beginning of history (most recent first)
    // Keep only last 50 entries
    const updatedHistory = [historyEntry, ...searchHistory].slice(0, 50);
    
    console.log('📋 Updating Firestore with new history entry...');
    await updateDoc(userRef, {
      searchHistory: updatedHistory,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Search history saved to Firestore:', {
      userId,
      query: query.trim(),
      resultCount: contacts?.length || 0,
      totalHistoryEntries: updatedHistory.length,
      wasNewDocument
    });
    
    // Verify the save by reading it back
    const verifySnap = await getDoc(userRef);
    if (verifySnap.exists()) {
      const verifyData = verifySnap.data();
      console.log('✅ Verified: Search history in Firestore:', {
        historyLength: verifyData?.searchHistory?.length || 0,
        latestQuery: verifyData?.searchHistory?.[0]?.query || 'none'
      });
    }
  } catch (error) {
    console.error('❌ Error saving search history:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 300)
    });
    // Don't throw - history tracking is non-critical
  }
};

/**
 * Get user search history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of search history entries
 */
export const getSearchHistory = async (userId) => {
  if (!db || !userId) {
    console.warn('⚠️ Firestore not initialized or userId missing', { db: !!db, userId });
    return [];
  }

  try {
    console.log('📋 Getting search history for user:', userId);
    const userData = await getUserData(userId);
    const history = userData?.searchHistory || [];
    console.log('📋 Retrieved search history from Firestore:', {
      hasUserData: !!userData,
      hasSearchHistory: !!userData?.searchHistory,
      historyLength: history.length,
      historyType: Array.isArray(history) ? 'array' : typeof history
    });
    return history;
  } catch (error) {
    console.error('❌ Error getting search history:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code
    });
    return [];
  }
};

/**
 * Delete a search history entry
 * @param {string} userId - User ID
 * @param {string} historyId - History entry ID
 * @returns {Promise<void>}
 */
export const deleteSearchHistoryEntry = async (userId, historyId) => {
  if (!db || !userId || !historyId) {
    console.warn('Firestore not initialized or missing parameters');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);
    const searchHistory = userData?.searchHistory || [];
    
    // Remove the entry with matching ID
    const updatedHistory = searchHistory.filter(entry => entry.id !== historyId);
    
    await updateDoc(userRef, {
      searchHistory: updatedHistory,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Search history entry deleted');
  } catch (error) {
    console.error('Error deleting search history entry:', error);
    throw error;
  }
};

/**
 * Migrate data from localStorage to Firestore
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const migrateLocalStorageToFirestore = async (userId) => {
  if (!db || !userId) return;

  try {
    const userData = await getUserData(userId);
    
    // Only migrate if user document doesn't have data yet
    if (userData?.contacts?.shortlist?.length > 0 || 
        userData?.templates?.length > 0) {
      console.log('User data already exists in Firestore, skipping migration');
      return;
    }

    // Migrate contacts
    const localContacts = localStorage.getItem('myContacts');
    if (localContacts) {
      try {
        const contacts = JSON.parse(localContacts);
        if (contacts.shortlist || contacts.sent || contacts.trash) {
          await updateUserContacts(userId, contacts);
          console.log('✅ Migrated contacts from localStorage to Firestore');
        }
      } catch (e) {
        console.warn('Failed to migrate contacts:', e);
      }
    }

    // Migrate templates
    const localTemplates = localStorage.getItem('emailTemplates');
    if (localTemplates) {
      try {
        const templates = JSON.parse(localTemplates);
        if (Array.isArray(templates) && templates.length > 0) {
          await updateUserTemplates(userId, templates);
          console.log('✅ Migrated templates from localStorage to Firestore');
        }
      } catch (e) {
        console.warn('Failed to migrate templates:', e);
      }
    }

    // Migrate profile
    const localProfile = localStorage.getItem('userProfile');
    if (localProfile) {
      try {
        const profile = JSON.parse(localProfile);
        await updateUserProfile(userId, profile);
        console.log('✅ Migrated profile from localStorage to Firestore');
      } catch (e) {
        console.warn('Failed to migrate profile:', e);
      }
    }
  } catch (error) {
    console.error('Error migrating localStorage to Firestore:', error);
  }
};

