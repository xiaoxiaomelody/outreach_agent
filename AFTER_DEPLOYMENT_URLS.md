# 🔗 What to Do With Links After Deployment

## Quick Answer

After deploying, you'll get 2 URLs. Here's exactly what to do with them:

---

## 📍 Step-by-Step

### 1. Deploy Backend First

```bash
firebase deploy --only apphosting
```

**You'll get:**
```
✔ Deployment complete!
URL: https://outreach-agent-abc123.web.app
```

**SAVE THIS URL!** ✍️ **Backend URL:** `https://outreach-agent-abc123.web.app`

---

### 2. Update This File: `frontend/src/api/backend.js`

**Change line 11** from:
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
```

**To use your backend URL in `.env`** - Create `frontend/.env.production`:
```bash
VITE_BACKEND_URL=https://outreach-agent-abc123.web.app
```

✅ **DONE:** Frontend now knows where your backend is!

---

### 3. Deploy Frontend

```bash
cd frontend
vercel --prod
```

**You'll get:**
```
✔ Production: https://your-app.vercel.app
```

**SAVE THIS URL!** ✍️ **Frontend URL:** `https://your-app.vercel.app`

---

### 4. Update This File: `backend/index.js`

**Around line 15-20**, add your frontend URL:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-app.vercel.app',  // ← ADD YOUR FRONTEND URL HERE!
];
```

**Redeploy backend:**
```bash
firebase deploy --only apphosting
```

✅ **DONE:** Backend now accepts requests from your frontend!

---

## 🎯 Summary Table

| What | File to Update | Change |
|------|---------------|--------|
| **Backend URL** | `frontend/.env.production` | `VITE_BACKEND_URL=https://backend-url` |
| **Frontend URL** | `backend/index.js` line 17 | Add to `allowedOrigins` array |

---

## 🧪 Test Everything Works

1. **Open your frontend URL:** `https://your-app.vercel.app`
2. **Sign up with test account**
3. **Open browser console (F12)**
4. **Check Network tab:**
   - Requests should go to `https://backend-url.web.app`
   - NOT `http://localhost:8080`
5. **No CORS errors** = ✅ Success!

---

## 💡 Why Do This?

```
Local Development:
Frontend (localhost:3000) → Backend (localhost:8080)
✅ Works because both are localhost

Production:
Frontend (vercel.app) → Backend (localhost:8080)  
❌ FAILS! Backend is not on localhost anymore!

Production (Fixed):
Frontend (vercel.app) → Backend (firebase.web.app)
✅ Works because frontend knows the correct URL!
```

---

## 🔄 The Complete Flow

```
┌─────────────────────────────────────┐
│ 1. Deploy Backend                   │
│    Get: https://backend-abc.web.app │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 2. Update Frontend .env             │
│    VITE_BACKEND_URL=backend-url     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 3. Deploy Frontend                  │
│    Get: https://frontend.vercel.app │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 4. Update Backend CORS              │
│    allowedOrigins = [frontend-url]  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 5. Redeploy Backend                 │
│    firebase deploy --only apphosting│
└────────────┬────────────────────────┘
             │
             ▼
        ✅ DONE!
```

---

## 📋 Copy-Paste Template

After getting your URLs, fill this in:

```bash
# My Deployment URLs
Backend:  https://______________________.web.app
Frontend: https://______________________.vercel.app
```

**Then update:**

1. **`frontend/.env.production`:**
```bash
VITE_BACKEND_URL=https://______________________.web.app
```

2. **`backend/index.js` (line ~17):**
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://______________________.vercel.app',  // Your frontend URL
];
```

3. **Redeploy both:**
```bash
firebase deploy --only apphosting
cd frontend && vercel --prod
```

---

## 🆘 Quick Troubleshooting

### "Failed to fetch" error
→ Check `VITE_BACKEND_URL` is set correctly in `.env.production`

### CORS error
→ Add your frontend URL to `allowedOrigins` in `backend/index.js`

### API calls go to localhost
→ Rebuild frontend: `npm run build` then redeploy

### "Not allowed by CORS"
→ Redeploy backend after updating `allowedOrigins`

---

## ✅ You're Done When:

- ✅ Frontend loads at your Vercel/Netlify URL
- ✅ You can sign up/sign in
- ✅ Dashboard loads
- ✅ No errors in browser console
- ✅ Network tab shows requests to production backend (not localhost)

---

## 📚 Need More Details?

- **Complete guide:** `DEPLOYMENT_GUIDE.md`
- **Step-by-step checklist:** `DEPLOYMENT_CHECKLIST.md`
- **Code structure:** `CODE_REVIEW_AND_STRUCTURE.md`

