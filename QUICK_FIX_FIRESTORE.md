# Quick Fix: Firestore Not Working

## The Problem
- Contacts not appearing in database
- "Missing or insufficient permissions" errors
- Data not being saved

## Solution: Deploy Firestore Security Rules

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select your project

### Step 2: Open Firestore Rules
1. Click **"Firestore Database"** in left sidebar
2. Click **"Rules"** tab at the top

### Step 3: Copy Rules
Copy this entire content:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      // Allow read/write only if the user is the owner
      allow read, write: if isOwner(userId);
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 4: Paste and Publish
1. Paste the rules into the editor
2. Click **"Publish"** button
3. Wait for confirmation

### Step 5: Test
1. Refresh your app
2. Sign in again
3. Try adding a contact
4. Check Firebase Console → Firestore → `users` collection
5. You should see your user document with contacts!

## What These Rules Do
- ✅ Allow authenticated users to read/write their own user document
- ✅ Prevent users from accessing other users' data
- ✅ Block unauthenticated access

## Still Not Working?

### Check Browser Console
Look for these messages:
- `✅ Firebase initialized successfully`
- `✅ User profile created/updated in Firestore successfully`
- `✅ User contacts updated in Firestore successfully`

### Check Firebase Console
1. Go to Firestore Database
2. Look for `users` collection
3. Find document with your user ID
4. Check if it has `contacts` field

### Common Issues

**"Permission denied" still appears:**
- Rules might not be deployed yet (wait a few seconds)
- Try hard refresh: Ctrl+Shift+R

**"Firestore not initialized":**
- Check your `.env` file has all Firebase config
- Restart dev server after changing `.env`

**User document doesn't exist:**
- Sign out and sign back in
- This will create the user document

