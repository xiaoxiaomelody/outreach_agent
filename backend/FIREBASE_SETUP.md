# Firebase Setup Guide

## Quick Fix for Local Development

### Option 1: Dev Mode (Easiest - Already Configured!)

Your `.env` file is already set to `DEV_MODE=true`, which means:
- ✅ Authentication is bypassed for local testing
- ✅ Mock user is created automatically
- ✅ You can test the API immediately
- ✅ No Firebase configuration needed yet

**Just restart your server and it will work!**

```bash
cd backend
npm run dev
```

You should see:
```
⚠️  DEV_MODE: Skipping authentication (mock user)
```

---

## Option 2: Full Firebase Setup (For Production)

When you're ready to deploy, follow these steps:

### Step 1: Get Firebase Project ID

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Click the gear icon → Project Settings
4. Copy your **Project ID**

### Step 2: Update .env

```bash
# In backend/.env, update:
FIREBASE_PROJECT_ID=your-actual-project-id
DEV_MODE=false  # Change to false for production
```

### Step 3: Set Up Service Account (for local production testing)

1. In Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json` in your `backend/` folder
4. Add to `.gitignore`:
   ```
   firebase-service-account.json
   ```

### Step 4: Update Firebase Config

In `backend/src/config/firebase.js`, add:

```javascript
function initializeFirebase() {
  if (!admin.apps.length) {
    if (process.env.NODE_ENV === 'development' && require('fs').existsSync('./firebase-service-account.json')) {
      admin.initializeApp({
        credential: admin.credential.cert(require('../firebase-service-account.json')),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      admin.initializeApp();
    }
  }
  return admin;
}
```

---

## Current Setup

Right now you're using **Dev Mode** which is perfect for:
- ✅ Testing Hunter.io integration
- ✅ Testing AI summaries
- ✅ Building and testing UI
- ✅ Local development

**No Firebase configuration needed yet!**

---

## When to Switch to Production Mode

Switch `DEV_MODE=false` when:
- Deploying to production
- Testing real user authentication
- Using Firebase features (Firestore, Storage)

---

## Troubleshooting

### "Unable to detect a Project Id"
- ✅ **Solution**: Make sure `DEV_MODE=true` in `.env`
- ✅ Restart your server after changing `.env`

### "Token verification failed"
- If `DEV_MODE=true`: Server will skip token verification
- If `DEV_MODE=false`: You need proper Firebase setup (see Option 2)

### Still having issues?
- Check that `.env` file exists in `backend/` folder
- Make sure you restarted the server after creating `.env`
- Verify `DEV_MODE=true` is set

---

## Summary

**For now (Local Development):**
- ✅ `.env` created with `DEV_MODE=true`
- ✅ Auth bypassed for testing
- ✅ Mock user created automatically
- ✅ Ready to test Hunter.io!

**For later (Production):**
- Set up Firebase project
- Get service account credentials
- Set `DEV_MODE=false`
- Deploy with full authentication

---

**Your server should now work! Just restart it:**

```bash
cd backend
npm run dev
```

🎉 Ready to test your Dashboard!

