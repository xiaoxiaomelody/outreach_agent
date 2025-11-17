# 🚀 Deployment Guide

## Overview

After deployment, you'll have TWO URLs:
1. **Backend URL** - Your API (Firebase App Hosting / Cloud Run)
2. **Frontend URL** - Your web app (Vercel, Netlify, Firebase Hosting, etc.)

You need to update your code to use these production URLs.

---

## 📍 Step 1: Deploy Backend

### Deploy to Firebase App Hosting

```bash
# From project root
firebase deploy --only apphosting
```

After deployment, you'll get a URL like:
```
✔ Backend deployed!
URL: https://outreach-agent-RANDOM_ID.web.app
```

**SAVE THIS URL!** You'll need it for Step 3.

Example backend URL:
```
https://outreach-agent-abc123.web.app
```

---

## 📍 Step 2: Update Backend CORS

Before deploying frontend, update your backend to only accept requests from your frontend domain.

### Edit `backend/index.js`:

**Option A: If deploying to Vercel/Netlify** (Recommended)

```javascript
// Before (Line 14)
app.use(cors()); // Allow requests from your frontend

// After
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'https://your-app-name.vercel.app',  // Production frontend URL
  'https://your-custom-domain.com',    // Your custom domain (if any)
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Option B: Allow all (Quick but less secure)**

```javascript
app.use(cors({
  origin: '*',
  credentials: false
}));
```

**Then redeploy backend:**
```bash
firebase deploy --only apphosting
```

---

## 📍 Step 3: Update Frontend Backend URL

### Method 1: Using Environment Variables (BEST PRACTICE)

1. **Update `frontend/src/api/backend.js`:**

```javascript
// Before (Line 11)
const BACKEND_URL = 'http://localhost:8080'; // Change in production

// After
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
```

2. **Update `frontend/.env`:**

```bash
# Local development
VITE_BACKEND_URL=http://localhost:8080

# Firebase config
VITE_FIREBASE_API_KEY=AIzaSyDxx8BnzlhHTXmM-yuqUHxoIR-BhQ2E1sM
VITE_FIREBASE_AUTH_DOMAIN=cs32fp-dd790.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cs32fp-dd790
VITE_FIREBASE_STORAGE_BUCKET=cs32fp-dd790.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1070896791098
VITE_FIREBASE_APP_ID=1:1070896791098:web:7eb2175f84bc60687dbf03
VITE_FIREBASE_MEASUREMENT_ID=G-KY0RXYK4SB
```

3. **Configure production environment variables in your hosting platform:**

#### For Vercel:
```bash
# In Vercel dashboard > Your Project > Settings > Environment Variables
VITE_BACKEND_URL = https://outreach-agent-abc123.web.app

# Add all Firebase config variables too
VITE_FIREBASE_API_KEY = AIzaSyDxx8BnzlhHTXmM-yuqUHxoIR-BhQ2E1sM
# ... etc
```

#### For Netlify:
```bash
# In Netlify dashboard > Site settings > Environment variables
VITE_BACKEND_URL = https://outreach-agent-abc123.web.app
# ... etc
```

#### For Firebase Hosting:
Create `frontend/.env.production`:
```bash
VITE_BACKEND_URL=https://outreach-agent-abc123.web.app
# ... Firebase config
```

### Method 2: Hardcode (Quick but not recommended)

```javascript
// frontend/src/api/backend.js (Line 11)
const BACKEND_URL = 'https://outreach-agent-abc123.web.app';
```

---

## 📍 Step 4: Deploy Frontend

### Option A: Vercel (Recommended - Easiest)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd frontend
vercel
```

3. **Follow prompts:**
- Link to existing project? → No (first time)
- Project name? → outreach-frontend
- Directory? → `./` (current directory)
- Override settings? → No

4. **Set environment variables:**
```bash
vercel env add VITE_BACKEND_URL
# Paste: https://outreach-agent-abc123.web.app

vercel env add VITE_FIREBASE_API_KEY
# Paste: AIzaSyDxx8BnzlhHTXmM-yuqUHxoIR-BhQ2E1sM
# ... repeat for all Firebase config variables
```

5. **Deploy to production:**
```bash
vercel --prod
```

You'll get a URL like:
```
✅ Production: https://outreach-frontend.vercel.app
```

---

### Option B: Netlify

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Build and deploy:**
```bash
cd frontend
netlify deploy --prod
```

3. **Set environment variables in Netlify dashboard:**
- Go to Site settings → Environment variables
- Add all VITE_* variables

---

### Option C: Firebase Hosting

1. **Initialize Firebase Hosting:**
```bash
# From project root
firebase init hosting
```

Choose:
- Public directory: `frontend/dist`
- Single-page app: Yes
- Set up automatic builds: No

2. **Update `firebase.json`:**
```json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "apphosting": [
    {
      "backendId": "outreach-agent",
      "rootDir": "backend",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ]
    }
  ]
}
```

3. **Build and deploy:**
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

---

## 📍 Step 5: Update Backend CORS with Final Frontend URL

Now that you have your frontend URL, update backend CORS:

```javascript
// backend/index.js
const allowedOrigins = [
  'http://localhost:3000',
  'https://outreach-frontend.vercel.app',  // ← Your actual frontend URL
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**Redeploy backend:**
```bash
firebase deploy --only apphosting
```

---

## 📍 Step 6: Test Your Production App

1. **Open your frontend URL:**
   ```
   https://outreach-frontend.vercel.app
   ```

2. **Sign up a new user**

3. **Open browser console (F12) and check:**
   - No CORS errors
   - API calls go to your production backend URL
   - Authentication works

4. **Test API calls:**
   ```javascript
   // In browser console
   const response = await fetch('https://outreach-agent-abc123.web.app/api/hello');
   const data = await response.json();
   console.log(data);
   ```

---

## 📋 Quick Checklist

After deployment, verify:

- [ ] Backend deployed and accessible
  - Test: `curl https://your-backend-url.web.app/api/hello`
  
- [ ] Frontend environment variables set
  - Check: `VITE_BACKEND_URL` points to production backend
  
- [ ] Backend CORS configured
  - Allows frontend domain
  
- [ ] Frontend deployed and accessible
  - Open in browser
  
- [ ] Authentication works
  - Sign up, sign in, logout
  
- [ ] API calls work
  - Check browser console for errors
  
- [ ] No CORS errors
  - Check browser console

---

## 🔧 Common Issues

### Issue: CORS Error in Production

**Error in browser console:**
```
Access to fetch at 'https://backend.web.app/api/...' from origin 'https://frontend.vercel.app' 
has been blocked by CORS policy
```

**Solution:**
Add your frontend URL to allowed origins in `backend/index.js`:
```javascript
const allowedOrigins = [
  'https://frontend.vercel.app',  // Add this!
];
```

Then redeploy backend:
```bash
firebase deploy --only apphosting
```

---

### Issue: Environment Variables Not Working

**Symptom**: `VITE_BACKEND_URL` is undefined

**Solution:**

1. **Check variable name** - Must start with `VITE_`
2. **Restart dev server** after changing `.env`
3. **In production**, set variables in hosting platform dashboard
4. **Rebuild** after adding variables:
   ```bash
   npm run build
   vercel --prod
   ```

---

### Issue: Backend URL Points to Localhost

**Symptom**: API calls fail with "Failed to fetch"

**Check in browser console:**
```javascript
console.log(import.meta.env.VITE_BACKEND_URL);
// Should show: https://backend-url.web.app
// NOT: http://localhost:8080
```

**Solution:**
1. Set `VITE_BACKEND_URL` in your hosting platform
2. Redeploy frontend

---

### Issue: 401 Unauthorized

**Symptom**: All API calls return 401

**Possible causes:**
1. User not signed in → Sign in first
2. Token expired → Sign out and sign in again
3. Firebase project mismatch → Check Firebase config

---

## 🌐 Custom Domain (Optional)

### For Frontend (Vercel)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain: `www.yourapp.com`
3. Follow DNS configuration instructions
4. Update backend CORS to include your custom domain

### For Backend

Firebase App Hosting uses web.app domains. For custom domain:
1. Use Firebase Hosting + Cloud Functions
2. Or use a reverse proxy (not recommended for beginners)

---

## 📊 URL Summary After Deployment

| Environment | Backend URL | Frontend URL |
|-------------|-------------|--------------|
| **Local** | `http://localhost:8080` | `http://localhost:3000` |
| **Production** | `https://outreach-agent-xyz.web.app` | `https://your-app.vercel.app` |

---

## 🎯 Final Code Changes Required

### 1. `frontend/src/api/backend.js` (Line 11)

```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
```

### 2. `backend/index.js` (Around Line 14)

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-frontend.vercel.app',  // Replace with your actual URL
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### 3. `frontend/.env` (or hosting platform env vars)

```bash
VITE_BACKEND_URL=https://your-backend.web.app
```

---

## 🚀 One-Command Deployment Script

Create `deploy.sh` in project root:

```bash
#!/bin/bash

echo "🚀 Deploying Outreach App..."

# Deploy backend
echo "📦 Deploying backend..."
firebase deploy --only apphosting

# Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build

# Deploy frontend (Vercel)
echo "📤 Deploying frontend..."
vercel --prod

echo "✅ Deployment complete!"
echo "Don't forget to update CORS in backend with your frontend URL!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run:
```bash
./deploy.sh
```

---

## 📝 Post-Deployment Notes

Remember to:
1. **Update CORS** every time you change frontend domain
2. **Set environment variables** in hosting platform for production
3. **Test thoroughly** after each deployment
4. **Monitor logs** for errors
5. **Set up custom domain** for professional appearance

---

## 🆘 Need Help?

- Backend issues → Check Firebase Console logs
- Frontend issues → Check browser console
- CORS issues → Verify allowed origins in backend
- Auth issues → Check Firebase Authentication dashboard

