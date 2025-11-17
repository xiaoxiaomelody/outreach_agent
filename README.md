# Outreach Application

Full-stack application with Firebase backend and frontend integration.

## Project Structure

```
outreach_cloud_functions/
├── backend/              # Backend API (Express + Firebase Admin SDK)
│   ├── index.js         # Main server file
│   ├── package.json     # Backend dependencies
│   └── test-auth.js     # Authentication tests
├── frontend/            # Frontend application
│   └── src/
│       ├── api/         # API integration
│       ├── config/      # Firebase config
│       └── pages/       # React pages
├── firebase.json        # Firebase configuration
├── apphosting.yaml      # Cloud Run settings
├── README.md           # This file
└── FRONTEND_INTEGRATION.md  # Frontend setup guide
```

## Getting Started

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:8080`

### Frontend Setup

Your frontend is in a separate directory. See `FRONTEND_INTEGRATION.md` for complete setup instructions.

## Authentication Overview

This application uses **Firebase Authentication** with ID token verification:

### Flow:
1. **Frontend**: User signs in using Firebase Client SDK (email/password, Google, etc.)
2. **Frontend**: Gets an ID token from Firebase: `await user.getIdToken()`
3. **Frontend**: Sends the token in the `Authorization` header to backend
4. **Backend**: Verifies the token using Firebase Admin SDK
5. **Backend**: If valid, processes the request with the user's identity

### You DON'T need a separate "login dataset"
Firebase Authentication IS your user database. It securely stores:
- User credentials (hashed passwords)
- OAuth provider links (Google, Facebook, etc.)
- User profiles (email, name, photo)

## API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/hello` - Test endpoint
- `GET /api/health` - Health check

### Protected Endpoints (Require Authentication)
- `GET /api/user/profile` - Get current user's profile
- `PUT /api/user/profile` - Update current user's profile
- `GET /api/data/:collection` - Get user's own data
- `POST /api/data/:collection` - Create data (auto-adds userId)
- `PUT /api/data/:collection/:id` - Update user's own data
- `DELETE /api/data/:collection/:id` - Delete user's own data

### Admin Endpoints
- `POST /api/admin/users` - Create a new user account
- `GET /api/admin/users/:uid` - Get user info by UID

## Frontend Integration

### Quick Example

```javascript
import { auth } from './firebase';

// Get user token
const user = auth.currentUser;
const idToken = await user.getIdToken();

// Make authenticated request
const response = await fetch('http://localhost:8080/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
```

For complete frontend integration guide with React examples, see **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)**

## Deployment

### Deploy Backend to Cloud Run

```bash
firebase deploy --only apphosting
```

### Deploy Frontend

Deploy your frontend to:
- Firebase Hosting
- Vercel
- Netlify
- Any static hosting service

## Security Best Practices

1. ✅ **Always verify tokens on the backend** - Never trust client-side claims
2. ✅ **Use HTTPS in production** - Tokens should never be sent over HTTP
3. ✅ **Don't log tokens** - They're sensitive credentials
4. ✅ **Set up Firestore Security Rules** - Backend auth + Firestore rules = defense in depth
5. ✅ **Implement rate limiting** - Prevent abuse
6. ✅ **Use custom claims for roles** - Add admin/user roles to tokens

## Token Expiration & Refresh

Firebase ID tokens expire after **1 hour**. The Firebase Client SDK automatically handles token refresh:

```javascript
// This automatically gets a fresh token if the old one expired
const idToken = await user.getIdToken(); // force refresh: getIdToken(true)
```

## Testing

### Test Backend

```bash
cd backend
node test-auth.js
```

### Test with curl

```bash
# Public endpoint (no token needed)
curl http://localhost:8080/api/hello

# Protected endpoint (needs token)
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
     http://localhost:8080/api/user/profile
```

## What You DON'T Need

❌ A separate login database - Firebase Auth handles this  
❌ Password hashing/salting - Firebase does this securely  
❌ Session management - Tokens handle this  
❌ The client SDK code in your backend - Only use Admin SDK

## Documentation Files

- **README.md** (this file) - Project overview
- **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)** - Complete frontend setup guide with examples
- **[backend/README.md](./backend/README.md)** - Backend-specific documentation

## Next Steps

1. ✅ Backend authentication is set up
2. ✅ Backend organized in `backend/` folder
3. Add Firebase Auth to your frontend (see FRONTEND_INTEGRATION.md)
4. Implement sign up/sign in UI
5. Test authenticated API calls
6. Set up custom claims for admin roles (if needed)
7. Configure Firestore security rules
8. Deploy to production

## Support

For issues or questions:
1. Check `FRONTEND_INTEGRATION.md` for frontend setup
2. Check `backend/README.md` for backend details
3. Review the code comments in `backend/index.js`
