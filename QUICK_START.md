# 🚀 Quick Start Guide

## Issues Fixed ✅

1. **Fixed broken import path** in `frontend/src/api/backend.js`
2. **Added missing Firebase imports** for authentication functions
3. **Removed duplicate Firebase config** - now using single source in `config/firebase.js`
4. **Added `.gitignore`** to frontend

---

## Start Your App (2 Terminals)

### Terminal 1: Backend

```bash
cd backend
npm install
npm run dev
```

You should see:
```
Backend server running on port 8080
```

### Terminal 2: Frontend

```bash
cd frontend
npm install
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

---

## Test the Full Flow

### 1. Sign Up

1. Open **http://localhost:3000**
2. Click "Sign Up"
3. Enter:
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. Click "Sign Up"

### 2. You're In!

You'll be redirected to the Dashboard showing:
- Your email
- User ID
- Account creation time

### 3. Test Backend API (Optional)

Open your browser console (F12) and run:

```javascript
// Get current user token
const user = firebase.auth().currentUser;
const token = await user.getIdToken();
console.log("Token:", token);

// Make authenticated API call
const response = await fetch('http://localhost:8080/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
console.log("Profile:", data);
```

---

## File Structure Quick Reference

```
📁 Your project now has:

backend/
  ├── index.js          ← Express server + authentication
  ├── package.json      ← Backend dependencies
  └── test-auth.js      ← Test script

frontend/
  └── src/
      ├── config/
      │   ├── firebase.js    ← Firebase setup (SINGLE SOURCE)
      │   └── authUtils.js   ← Auth helpers
      ├── api/
      │   └── backend.js     ← API calls (FIXED IMPORTS)
      ├── pages/
      │   ├── Login.js       ← Login/signup page
      │   └── Dashboard.js   ← Protected page
      ├── components/
      │   └── ProtectedRoute.js ← Route protection
      └── App.js             ← Main app + routing
```

---

## What Changed?

### Before (Broken) ❌

```javascript
// frontend/src/api/backend.js
import { auth } from '../firebase';  // ❌ Wrong path!

// Missing imports
export async function signUp(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
  //    ↑ Not imported! Would crash!
}
```

### After (Fixed) ✅

```javascript
// frontend/src/api/backend.js
import { auth } from '../config/firebase';  // ✅ Correct!
import { 
  createUserWithEmailAndPassword,  // ✅ All imports added
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

export async function signUp(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
  //    ↑ Now properly imported!
}
```

---

## Common Issues & Solutions

### Issue: Backend won't start

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
cd backend
npm install
```

### Issue: Frontend won't start

**Error**: `Cannot find module 'react'`

**Solution**:
```bash
cd frontend
npm install
```

### Issue: "Firebase not configured"

**Solution**: Create `frontend/.env` with:
```
VITE_FIREBASE_API_KEY=AIzaSyDxx8BnzlhHTXmM-yuqUHxoIR-BhQ2E1sM
VITE_FIREBASE_AUTH_DOMAIN=cs32fp-dd790.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cs32fp-dd790
VITE_FIREBASE_STORAGE_BUCKET=cs32fp-dd790.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1070896791098
VITE_FIREBASE_APP_ID=1:1070896791098:web:7eb2175f84bc60687dbf03
VITE_FIREBASE_MEASUREMENT_ID=G-KY0RXYK4SB
```

Then restart frontend:
```bash
npm run dev
```

### Issue: CORS error

**Error**: `Access to fetch at 'http://localhost:8080' has been blocked by CORS policy`

**Solution**: Backend already has CORS enabled. Make sure backend is running.

### Issue: "No token provided"

**Cause**: User not signed in

**Solution**: Sign in first, then make API calls

---

## API Endpoints Available

### Public (No Auth)
- `GET /api/hello` - Test endpoint
- `GET /api/health` - Health check

### Protected (Needs Auth)
- `GET /api/user/profile` - Get your profile
- `PUT /api/user/profile` - Update your profile
- `GET /api/data/:collection` - Get your data
- `POST /api/data/:collection` - Create data
- `PUT /api/data/:collection/:id` - Update data
- `DELETE /api/data/:collection/:id` - Delete data

---

## Using the API in Your Code

### Get User Profile

```javascript
import { api } from './api/backend';

// In your component
const profile = await api.getProfile();
console.log(profile);
```

### Create Data

```javascript
import { api } from './api/backend';

const newPost = await api.createData('posts', {
  title: 'My First Post',
  content: 'Hello world!'
});
```

### Get Data

```javascript
import { api } from './api/backend';

const posts = await api.getData('posts');
console.log(posts);
```

---

## What You Can Build Now

With this setup, you can build:

- ✅ User authentication (sign up/login)
- ✅ Protected pages
- ✅ User profiles
- ✅ CRUD operations with user-owned data
- ✅ Secure backend API
- ✅ Token-based authentication

---

## Need More Help?

- **Full structure explanation**: See `CODE_REVIEW_AND_STRUCTURE.md`
- **Frontend integration guide**: See `FRONTEND_INTEGRATION.md`
- **Main documentation**: See `README.md`
- **Backend details**: See `backend/README.md`

---

## Summary

✅ **Backend**: Express server with Firebase Admin SDK for token verification  
✅ **Frontend**: React app with Firebase Client SDK for authentication  
✅ **Fixed**: Import paths, missing imports, duplicate configs  
✅ **Ready**: Full authentication flow working end-to-end  

**You're all set!** 🎉

