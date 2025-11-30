# Outreach Agent

A web-based application for finding contacts and sending automated personalized emails.

## Features

- 🔍 **Contact Sourcing**: Natural language search using Hunter.io API
- 🤖 **AI Summaries**: OpenAI-powered contact summaries
- 📧 **Email Integration**: Gmail OAuth for sending emails
- ✨ **Email Personalization**: AI-generated personalized email drafts

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase project
- Google OAuth credentials
- Hunter.io API key
- OpenAI API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=8080
DEV_MODE=false
FIREBASE_PROJECT_ID=your-project-id

# APIs
HUNTER_API_KEY=your-hunter-api-key
OPENAI_API_KEY=your-openai-api-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GMAIL_REDIRECT_URI=http://localhost:8080/api/auth/gmail/callback
```

4. Add Firebase service account:
   - Download `firebase-service-account.json` from Firebase Console
   - Place it in `backend/` directory

5. Start server:
```bash
npm start
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
VITE_BACKEND_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4. Start development server:
```bash
npm run dev
```

## Usage

1. **Login**: Sign in with email/password or Google
2. **Find Contacts**: Use natural language search (e.g., "Find 10 engineers at Google")
3. **Accept Contacts**: Review and accept contacts you want to email
4. **Draft Emails**: Enter a template and generate personalized drafts
5. **Connect Gmail**: Authorize Gmail to send emails
6. **Send Emails**: Send individual or batch emails

## Project Structure

```
backend/
  src/
    controllers/    # Request handlers
    services/      # Business logic (Hunter, Gmail, OpenAI)
    routes/        # API routes
    config/        # Configuration (Firebase, CORS)
    middleware/    # Auth middleware

frontend/
  src/
    pages/         # Main pages (Login, Dashboard)
    components/    # Reusable components
    api/           # API clients
    config/        # Firebase config
```

## Environment Variables

See `.env.example` files in backend/ and frontend/ directories for required variables.
