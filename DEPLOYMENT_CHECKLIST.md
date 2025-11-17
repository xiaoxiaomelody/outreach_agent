# ✅ Deployment Checklist

Use this checklist when deploying your app to production.

---

## 🔥 PRE-DEPLOYMENT

### Backend Preparation
- [ ] Backend code is tested locally (`npm start` in `backend/`)
- [ ] All dependencies are in `backend/package.json`
- [ ] Firebase Admin SDK is properly initialized
- [ ] Authentication middleware is working

### Frontend Preparation  
- [ ] Frontend works locally (`npm run dev` in `frontend/`)
- [ ] All dependencies are in `frontend/package.json`
- [ ] Firebase config is using environment variables
- [ ] `.env` file exists with all VITE_* variables
- [ ] `.gitignore` excludes `.env` file

---

## 🚀 DEPLOYMENT PROCESS

### Step 1: Deploy Backend

```bash
# From project root
firebase deploy --only apphosting
```

**Expected output:**
```
✔ Backend deployed successfully!
URL: https://outreach-agent-XXXXX.web.app
```

- [ ] Backend deployed successfully
- [ ] **SAVE YOUR BACKEND URL:** `_______________________________`
- [ ] Test backend: `curl https://your-backend-url/api/hello`

---

### Step 2: Update Frontend Configuration

1. **Update `frontend/.env` (or create `.env.production`):**

```bash
VITE_BACKEND_URL=https://your-backend-url-from-step1.web.app
VITE_FIREBASE_API_KEY=AIzaSyDxx8BnzlhHTXmM-yuqUHxoIR-BhQ2E1sM
VITE_FIREBASE_AUTH_DOMAIN=cs32fp-dd790.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cs32fp-dd790
VITE_FIREBASE_STORAGE_BUCKET=cs32fp-dd790.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1070896791098
VITE_FIREBASE_APP_ID=1:1070896791098:web:7eb2175f84bc60687dbf03
VITE_FIREBASE_MEASUREMENT_ID=G-KY0RXYK4SB
```

- [ ] Created/updated `.env` with backend URL
- [ ] All Firebase config variables are set
- [ ] `VITE_BACKEND_URL` points to deployed backend

---

### Step 3: Deploy Frontend

**Choose your platform:**

#### Option A: Vercel (Recommended)

```bash
cd frontend

# First time only
vercel

# Set environment variables in Vercel dashboard:
# https://vercel.com/your-username/your-project/settings/environment-variables

# Deploy to production
vercel --prod
```

- [ ] Vercel project created
- [ ] Environment variables set in Vercel dashboard
- [ ] Frontend deployed to production
- [ ] **SAVE YOUR FRONTEND URL:** `_______________________________`

#### Option B: Netlify

```bash
cd frontend
npm run build
netlify deploy --prod

# Set environment variables in Netlify dashboard:
# https://app.netlify.com/sites/your-site/settings/deploys#environment
```

- [ ] Frontend built successfully
- [ ] Deployed to Netlify
- [ ] Environment variables set in dashboard
- [ ] **SAVE YOUR FRONTEND URL:** `_______________________________`

#### Option C: Firebase Hosting

```bash
# From project root
firebase init hosting
# Choose: frontend/dist as public directory

cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

- [ ] Firebase Hosting initialized
- [ ] Frontend built successfully
- [ ] Deployed to Firebase Hosting
- [ ] **SAVE YOUR FRONTEND URL:** `_______________________________`

---

### Step 4: Update Backend CORS

Edit `backend/index.js` (around line 17):

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-frontend-url-from-step3.vercel.app',  // ← ADD THIS!
];
```

- [ ] Added frontend URL to `allowedOrigins` array
- [ ] Saved file

**Redeploy backend:**
```bash
firebase deploy --only apphosting
```

- [ ] Backend redeployed with updated CORS

---

## 🧪 POST-DEPLOYMENT TESTING

### Basic Functionality
- [ ] Open frontend URL in browser
- [ ] Frontend loads without errors
- [ ] No console errors (F12 → Console tab)

### Authentication Flow
- [ ] Can access sign up page
- [ ] Can create new account
- [ ] Redirects to dashboard after signup
- [ ] Can sign out
- [ ] Can sign in with existing account
- [ ] Protected routes work (can't access /dashboard without login)

### Backend API
- [ ] Open browser console (F12)
- [ ] Check Network tab for API calls
- [ ] API calls go to production backend URL (not localhost)
- [ ] API calls return 200 status codes
- [ ] No CORS errors

### Test API Manually
```bash
# Test public endpoint
curl https://your-backend-url.web.app/api/hello

# Expected: {"message":"Backend is running!"}
```

- [ ] Public endpoints accessible
- [ ] Backend responds correctly

### Authentication API Test

1. Sign in to your app
2. Open browser console
3. Run:
```javascript
const response = await fetch('https://your-backend-url.web.app/api/user/profile', {
  credentials: 'include'
});
console.log(await response.json());
```

- [ ] Authenticated API calls work
- [ ] User profile data returned correctly

---

## 🔒 SECURITY CHECKS

- [ ] `.env` files NOT committed to git
- [ ] Firebase API key is client SDK key (safe to expose)
- [ ] CORS only allows your frontend domain
- [ ] Backend authentication middleware is active
- [ ] Firebase security rules are configured

---

## 📊 MONITORING

### Backend Monitoring
- [ ] Check Firebase Console → Functions
- [ ] Monitor error logs
- [ ] Check for failed requests

### Frontend Monitoring  
- [ ] Check hosting platform analytics
- [ ] Monitor browser console for errors
- [ ] Test on different browsers

---

## 🌐 OPTIONAL: Custom Domain

### For Frontend
- [ ] Purchase domain
- [ ] Add domain in hosting platform
- [ ] Configure DNS records
- [ ] Wait for SSL certificate
- [ ] Update backend CORS with custom domain

### For Backend
- [ ] Firebase App Hosting uses `.web.app` domain
- [ ] Custom domain requires Firebase Hosting + Cloud Functions

---

## 📝 FINAL NOTES

### URLs to Document

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | `https://___________________` | ☐ Working |
| **Frontend App** | `https://___________________` | ☐ Working |
| **Custom Domain** | `https://___________________` | ☐ Optional |

### Credentials to Save

- [ ] Firebase project ID: `cs32fp-dd790`
- [ ] Backend deployment ID: `________________________`
- [ ] Frontend deployment URL: `________________________`

### Post-Deployment Tasks

- [ ] Update README.md with production URLs
- [ ] Share app URL with team/users
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Configure email verification
- [ ] Set up backups
- [ ] Create admin user

---

## 🆘 TROUBLESHOOTING

### If frontend doesn't load:
1. Check hosting platform build logs
2. Verify environment variables are set
3. Clear browser cache
4. Check for build errors in terminal

### If backend returns CORS errors:
1. Verify frontend URL in `allowedOrigins` array
2. Redeploy backend after changes
3. Check browser console for exact origin
4. Ensure credentials: true in CORS config

### If authentication fails:
1. Check Firebase Console → Authentication
2. Verify Firebase config in frontend `.env`
3. Check browser console for errors
4. Try signing up new user
5. Check token in browser console: `await firebase.auth().currentUser.getIdToken()`

### If API calls fail:
1. Check Network tab in browser console
2. Verify `VITE_BACKEND_URL` is set correctly
3. Test backend directly: `curl https://backend-url/api/hello`
4. Check backend logs in Firebase Console

---

## ✅ DEPLOYMENT COMPLETE!

Once all checkboxes are checked, your app is live! 🎉

**Next steps:**
- Monitor for errors
- Gather user feedback
- Plan next features
- Set up CI/CD pipeline

**Support:**
- Firebase Console: https://console.firebase.google.com
- Vercel Dashboard: https://vercel.com/dashboard
- Documentation: See DEPLOYMENT_GUIDE.md

