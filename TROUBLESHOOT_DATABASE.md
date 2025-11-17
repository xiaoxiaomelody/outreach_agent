# 🔍 Troubleshooting: Nothing in Database

## Common Reasons & Solutions

### ❌ Reason 1: Backend Not Running
If your backend isn't running, data can't be saved!

**Check:**
```bash
# Make sure you're in the backend directory
cd "C:\CS Stuff\cs320\outreach_cloud_functions\backend"
npm start
```

**You should see:**
```
Backend server running on port 8080
```

---

### ❌ Reason 2: Frontend Not Running
Frontend needs to be running to make API calls!

**Check:**
```bash
# In a NEW terminal
cd "C:\CS Stuff\cs320\outreach_cloud_functions\frontend"
npm run dev
```

**You should see:**
```
VITE ready in 500ms
➜ Local: http://localhost:3000/
```

---

### ❌ Reason 3: Haven't Created Any Data Yet!
**Firestore collections don't exist until you create the first document!**

This is the most common reason - you need to actually USE the app to create data.

**Test it:**

1. **Sign up a new user:**
   - Open http://localhost:3000
   - Click "Sign Up"
   - Email: `test@example.com`
   - Password: `password123`
   - Click "Sign Up"

2. **Update your profile** (creates `users/` collection):
   - Open browser console (F12)
   - Run:
   ```javascript
   const response = await fetch('http://localhost:8080/api/user/profile', {
     method: 'PUT',
     headers: {
       'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       name: 'Test User',
       bio: 'This is a test',
       location: 'NYC'
     })
   });
   console.log(await response.json());
   ```

3. **Create test data** (creates custom collection):
   ```javascript
   const response = await fetch('http://localhost:8080/api/data/posts', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       title: 'My First Post',
       content: 'Hello World!',
       tags: ['test', 'firebase']
     })
   });
   console.log(await response.json());
   ```

4. **Check Firebase Console:**
   - Go to https://console.firebase.google.com
   - Select project: `cs32fp-dd790`
   - Click "Firestore Database"
   - You should now see collections!

---

### ❌ Reason 4: Firestore Not Initialized

**Check Firebase Console:**
1. Go to https://console.firebase.google.com
2. Select your project: `cs32fp-dd790`
3. Click **Firestore Database** in the left menu

**If you see "Create database" button:**
- Click it
- Choose **Start in test mode** (for development)
- Select your region (e.g., `us-central`)
- Click Enable

---

### ❌ Reason 5: Looking in Wrong Place

**Make sure you're looking at FIRESTORE, not Realtime Database:**

✅ **Correct:** Firestore Database (this is what you're using)
```
Firebase Console → Firestore Database
```

❌ **Wrong:** Realtime Database (different service)
```
Firebase Console → Realtime Database
```

---

### ❌ Reason 6: Authentication Issues

**Check if user is signed in:**

Open browser console and run:
```javascript
const user = firebase.auth().currentUser;
if (user) {
  console.log('✅ Signed in:', user.email);
  console.log('UID:', user.uid);
} else {
  console.log('❌ Not signed in!');
}
```

If not signed in, sign up/in first!

---

## 🧪 Complete Test Script

Run this in your browser console after signing in:

```javascript
// Test 1: Check authentication
const user = firebase.auth().currentUser;
if (!user) {
  console.error('❌ Not signed in! Sign up first.');
} else {
  console.log('✅ Signed in as:', user.email);
  
  // Test 2: Get token
  const token = await user.getIdToken();
  console.log('✅ Got token:', token.substring(0, 20) + '...');
  
  // Test 3: Update profile
  try {
    const profileResponse = await fetch('http://localhost:8080/api/user/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        bio: 'Testing Firestore',
        location: 'Test City'
      })
    });
    const profileData = await profileResponse.json();
    console.log('✅ Profile updated:', profileData);
  } catch (error) {
    console.error('❌ Profile update failed:', error);
  }
  
  // Test 4: Create a post
  try {
    const postResponse = await fetch('http://localhost:8080/api/data/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Post',
        content: 'This is a test post to verify Firestore works!',
        tags: ['test', 'firebase', 'firestore']
      })
    });
    const postData = await postResponse.json();
    console.log('✅ Post created:', postData);
  } catch (error) {
    console.error('❌ Post creation failed:', error);
  }
  
  // Test 5: Get posts
  try {
    const getResponse = await fetch('http://localhost:8080/api/data/posts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const posts = await getResponse.json();
    console.log('✅ Posts retrieved:', posts);
  } catch (error) {
    console.error('❌ Get posts failed:', error);
  }
  
  console.log('\n🔍 Now check Firebase Console → Firestore Database');
  console.log('You should see:');
  console.log('  📁 users/');
  console.log('  📁 posts/');
}
```

---

## 📋 Checklist

Go through this checklist:

- [ ] **Firestore Database is enabled** in Firebase Console
- [ ] **Backend is running** on port 8080
- [ ] **Frontend is running** on port 3000
- [ ] **User is signed in** (check browser console)
- [ ] **Created some data** (updated profile or created posts)
- [ ] **Checked correct place** (Firestore Database, not Realtime Database)
- [ ] **No errors in console** (F12 → Console tab)
- [ ] **No CORS errors** (check Network tab)

---

## 🎯 Step-by-Step: Create Your First Database Entry

### Step 1: Start Backend
```bash
cd "C:\CS Stuff\cs320\outreach_cloud_functions\backend"
npm start
```

**Wait for:** `Backend server running on port 8080`

---

### Step 2: Start Frontend
```bash
# New terminal
cd "C:\CS Stuff\cs320\outreach_cloud_functions\frontend"
npm run dev
```

**Wait for:** `Local: http://localhost:3000/`

---

### Step 3: Sign Up
1. Open http://localhost:3000
2. Click "Sign Up"
3. Email: `test@example.com`
4. Password: `password123`
5. Confirm: `password123`
6. Click "Sign Up"

---

### Step 4: Open Browser Console
- Press **F12**
- Click **Console** tab

---

### Step 5: Create Test Data

Copy and paste this into the console:

```javascript
// Get current user
const user = firebase.auth().currentUser;
const token = await user.getIdToken();

// Create a post
const response = await fetch('http://localhost:8080/api/data/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'My First Firestore Post!',
    content: 'Hello from Firestore!',
    emoji: '🎉'
  })
});

const result = await response.json();
console.log('Created:', result);
```

---

### Step 6: Check Firebase Console

1. Go to https://console.firebase.google.com
2. Click on `cs32fp-dd790` project
3. Click **Firestore Database** in left menu
4. You should see:

```
📁 posts
   └── 📄 [some-id]
       • userId: "..."
       • createdAt: Timestamp
       • title: "My First Firestore Post!"
       • content: "Hello from Firestore!"
       • emoji: "🎉"
```

**SUCCESS!** 🎉

---

## ⚠️ Common Errors & Fixes

### Error: "No token provided"
**Fix:** Make sure user is signed in first

### Error: "CORS policy"
**Fix:** Backend must be running with CORS enabled (it already is)

### Error: "Failed to fetch"
**Fix:** Backend is not running. Start it: `cd backend && npm start`

### Error: "Invalid token"
**Fix:** Sign out and sign in again to get fresh token

### "Missing or insufficient permissions"
**Fix:** 
1. Go to Firebase Console → Firestore Database → Rules
2. Change to test mode temporarily:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🆘 Still Not Working?

### Debug Steps:

1. **Check Backend Logs:**
   - Look at the terminal where backend is running
   - Any errors?

2. **Check Browser Console:**
   - F12 → Console tab
   - Any red errors?

3. **Check Network Tab:**
   - F12 → Network tab
   - Make a request
   - Click on the request
   - What's the status code?
   - What's the response?

4. **Verify Firebase Project:**
   - Backend uses project: `cs32fp-dd790`
   - Is this the correct project?
   - Is Firestore enabled for this project?

---

## 💡 Quick Test Commands

**Test backend is running:**
```bash
curl http://localhost:8080/api/hello
```

**Expected:** `{"message":"Backend is running!"}`

**Test frontend is running:**
Open http://localhost:3000 in browser

**Test Firestore directly from code:**
```javascript
// In browser console (after signing in)
const db = firebase.firestore();
await db.collection('test').add({ message: 'Hello Firestore!' });
console.log('✅ Firestore works!');
```

Then check Firebase Console → Firestore Database for `test` collection.

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Backend shows: "Backend server running on port 8080"
2. ✅ Frontend loads at http://localhost:3000
3. ✅ You can sign up/sign in
4. ✅ Browser console shows no errors
5. ✅ Test commands return data
6. ✅ Firebase Console shows collections
7. ✅ Collections contain documents

---

## 📞 Need More Help?

If you've tried everything and it still doesn't work:

1. Share the error messages from:
   - Backend terminal
   - Browser console
   - Network tab

2. Confirm:
   - Backend is running? (Yes/No)
   - Frontend is running? (Yes/No)
   - User is signed in? (Yes/No)
   - Firestore is enabled? (Yes/No)

3. Try the complete test script above and share the output!

