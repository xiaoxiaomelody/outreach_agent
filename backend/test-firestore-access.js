/**
 * Firestore Access Test Script
 * 
 * This script tests accessing all fields stored in user documents in Firestore.
 * Run with: node test-firestore-access.js
 */

require('dotenv').config();
const { initializeFirebase, getFirestore } = require('./src/config/firebase');

// Initialize Firebase
console.log('🔧 Initializing Firebase...\n');
initializeFirebase();
const db = getFirestore();

if (!db) {
  console.error('❌ Firestore not available. Check your configuration.');
  console.log('💡 Make sure:');
  console.log('   1. DEV_MODE is not set to "true"');
  console.log('   2. firebase-service-account.json exists in backend/');
  console.log('   3. FIREBASE_PROJECT_ID is set in .env');
  process.exit(1);
}

/**
 * Recursively display object structure with indentation
 */
function displayObject(obj, indent = 0, maxDepth = 5) {
  const indentStr = '  '.repeat(indent);
  
  if (indent > maxDepth) {
    return `${indentStr}... (max depth reached)`;
  }
  
  if (obj === null || obj === undefined) {
    return `${indentStr}null/undefined`;
  }
  
  // Handle Firestore Timestamp
  if (obj && typeof obj.toDate === 'function') {
    return `${indentStr}Timestamp: ${obj.toDate().toISOString()}`;
  }
  
  // Handle Firestore FieldValue
  if (obj && obj.constructor && obj.constructor.name === 'FieldValue') {
    return `${indentStr}FieldValue: ${obj.constructor.name}`;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `${indentStr}[] (empty array)`;
    }
    let result = `${indentStr}Array[${obj.length}]:\n`;
    obj.forEach((item, index) => {
      if (index < 3) { // Show first 3 items
        result += `${indentStr}  [${index}]:\n`;
        if (typeof item === 'object' && item !== null) {
          result += displayObject(item, indent + 2, maxDepth);
        } else {
          result += `${indentStr}    ${item}\n`;
        }
      } else if (index === 3) {
        result += `${indentStr}  ... (${obj.length - 3} more items)\n`;
      }
    });
    return result;
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return `${indentStr}{} (empty object)`;
    }
    let result = `${indentStr}Object with ${keys.length} fields:\n`;
    keys.forEach(key => {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${indentStr}  ${key}:\n`;
        result += displayObject(value, indent + 2, maxDepth);
      } else if (Array.isArray(value)) {
        result += `${indentStr}  ${key}: `;
        result += displayObject(value, indent + 1, maxDepth);
      } else {
        const displayValue = typeof value === 'string' && value.length > 100
          ? value.substring(0, 100) + '... (truncated)'
          : value;
        result += `${indentStr}  ${key}: ${displayValue}\n`;
      }
    });
    return result;
  }
  
  return `${indentStr}${obj}`;
}

/**
 * Get all users from Firestore
 */
async function getAllUsers() {
  try {
    console.log('📋 Fetching all users from Firestore...\n');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    if (snapshot.empty) {
      console.log('⚠️  No users found in Firestore.');
      return [];
    }
    
    console.log(`✅ Found ${snapshot.size} user(s)\n`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
}

/**
 * Analyze and display user document structure
 */
function analyzeUserDocument(userId, userData) {
  console.log('═'.repeat(80));
  console.log(`📄 USER ID: ${userId}`);
  console.log('═'.repeat(80));
  console.log();
  
  // List all top-level fields
  const topLevelFields = Object.keys(userData);
  console.log(`📊 Top-level fields (${topLevelFields.length}):`, topLevelFields.join(', '));
  console.log();
  
  // Display each field
  topLevelFields.forEach(field => {
    console.log(`\n📦 Field: ${field}`);
    console.log('─'.repeat(80));
    const value = userData[field];
    
    if (value === null || value === undefined) {
      console.log('  Value: null/undefined');
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        console.log(`  Type: Array (${value.length} items)`);
        if (value.length > 0) {
          console.log('  Sample item structure:');
          console.log(displayObject(value[0], 2));
        }
      } else {
        console.log('  Type: Object');
        console.log('  Structure:');
        console.log(displayObject(value, 1));
      }
    } else {
      console.log(`  Type: ${typeof value}`);
      const displayValue = typeof value === 'string' && value.length > 200
        ? value.substring(0, 200) + '... (truncated)'
        : value;
      console.log(`  Value: ${displayValue}`);
    }
  });
  
  console.log();
}

/**
 * Generate summary statistics
 */
function generateSummary(users) {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY STATISTICS');
  console.log('═'.repeat(80));
  console.log();
  
  const stats = {
    totalUsers: users.length,
    fieldsFound: new Set(),
    usersWithContacts: 0,
    usersWithTemplates: 0,
    usersWithSearchHistory: 0,
    usersWithGmailConnected: 0,
    usersWithProfile: 0
  };
  
  users.forEach(user => {
    const data = user.data;
    Object.keys(data).forEach(key => stats.fieldsFound.add(key));
    
    if (data.contacts && (data.contacts.shortlist?.length > 0 || data.contacts.sent?.length > 0)) {
      stats.usersWithContacts++;
    }
    if (data.templates && data.templates.length > 0) {
      stats.usersWithTemplates++;
    }
    if (data.behavior?.searchHistory && data.behavior.searchHistory.length > 0) {
      stats.usersWithSearchHistory++;
    }
    if (data.gmailConnected) {
      stats.usersWithGmailConnected++;
    }
    if (data.profile) {
      stats.usersWithProfile++;
    }
  });
  
  console.log(`Total Users: ${stats.totalUsers}`);
  console.log(`Unique Fields Found: ${stats.fieldsFound.size}`);
  console.log(`Fields: ${Array.from(stats.fieldsFound).sort().join(', ')}`);
  console.log();
  console.log('Data Distribution:');
  console.log(`  Users with contacts: ${stats.usersWithContacts}/${stats.totalUsers}`);
  console.log(`  Users with templates: ${stats.usersWithTemplates}/${stats.totalUsers}`);
  console.log(`  Users with search history: ${stats.usersWithSearchHistory}/${stats.totalUsers}`);
  console.log(`  Users with Gmail connected: ${stats.usersWithGmailConnected}/${stats.totalUsers}`);
  console.log(`  Users with profile: ${stats.usersWithProfile}/${stats.totalUsers}`);
  console.log();
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Firestore Access Test\n');
    
    // Get all users
    const users = await getAllUsers();
    
    if (users.length === 0) {
      console.log('No users to analyze.');
      return;
    }
    
    // Analyze each user
    users.forEach((user, index) => {
      console.log(`\n\n${'='.repeat(80)}`);
      console.log(`USER ${index + 1} of ${users.length}`);
      console.log('='.repeat(80));
      analyzeUserDocument(user.id, user.data);
    });
    
    // Generate summary
    generateSummary(users);
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run the test
main()
  .then(() => {
    console.log('👋 Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

