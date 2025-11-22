# Outreach Agent

AI-powered contact sourcing and outreach application with automated email personalization.

## 📁 Project Structure

```
outreach_cloud_functions/
├── backend/                          # Backend API (Express + Firebase)
│   ├── src/
│   │   ├── services/                 # Business logic
│   │   │   ├── hunter-direct.service.js         # Hunter.io API integration
│   │   │   ├── hunter-with-summaries.service.js # Hunter + AI summaries
│   │   │   └── openai.service.js                # OpenAI integration
│   │   ├── controllers/              # Request handlers
│   │   │   └── contact.controller.js
│   │   ├── routes/                   # API routes
│   │   │   └── contact.routes.js
│   │   └── middleware/               # Express middleware
│   ├── index.js                      # Main server
│   ├── test-hunter-with-summaries.js # Test script
│   ├── package.json
│   └── .env                          # Environment variables (create this)
│
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── api/                      # API client
│   │   │   ├── backend.js
│   │   │   └── hunter.js
│   │   ├── components/               # React components
│   │   │   ├── sourcing/             # Contact sourcing UI
│   │   │   ├── email/                # Email drafting UI
│   │   │   └── auth/                 # Authentication UI
│   │   ├── pages/                    # Page components
│   │   │   ├── Login.js
│   │   │   └── Dashboard.js
│   │   ├── config/                   # Configuration
│   │   │   └── firebase.js
│   │   └── index.js
│   ├── package.json
│   └── .env.local                    # Frontend env vars (create this)
│
├── PROJECT_FILE_STRUCTURE.md         # Detailed architecture guide
├── backend/AI_SUMMARIES_GUIDE.md     # AI summaries documentation
└── backend/ENVIRONMENT_VARIABLES.md  # Environment setup guide
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase project
- Hunter.io API key
- OpenAI API key

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOL
PORT=8080
HUNTER_API_KEY=your-hunter-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
EOL

# Start development server
npm run dev
```

Backend runs on `http://localhost:8080`

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOL
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_BACKEND_URL=http://localhost:8080
EOL

# Start development server
npm run dev
```

Frontend runs on `http://localhost:3000` (or similar)

### 3. Test the Integration

```bash
cd backend
node test-hunter-with-summaries.js
```

You'll see real contact data with AI-generated summaries!

## 🔑 API Keys Setup

### Hunter.io API Key
1. Go to [https://hunter.io/api_keys](https://hunter.io/api_keys)
2. Sign up or log in
3. Copy your API key
4. Add to `backend/.env`: `HUNTER_API_KEY=your-key-here`

### OpenAI API Key
1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key
4. Add to `backend/.env`: `OPENAI_API_KEY=your-key-here`

### Firebase Configuration
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Go to Project Settings → General
4. Under "Your apps", add a web app
5. Copy the config values to `frontend/.env.local`

## ✨ Key Features

- **AI-Powered Contact Search**: Find professionals using Hunter.io API
- **Automated Summaries**: OpenAI generates professional summaries for each contact
- **Smart Filtering**: Search by company, department, seniority
- **Email Personalization**: AI drafts personalized emails based on contact info
- **Firebase Authentication**: Secure user authentication
- **Session Management**: Save and manage outreach campaigns

## 📊 Example Usage

### Find Contacts with AI Summaries

```javascript
// Backend API call
const result = await hunterWithSummaries.domainSearchWithSummaries('stripe.com', {
  limit: 10,
  department: 'it'
});

// Returns contacts with AI summaries:
{
  name: "Joel Karacozoff",
  email: "joel@stripe.com",
  position: "Partnerships Director",
  department: "management",
  summary: "Joel Karacozoff is an executive-level Partnerships Director at Stripe..."
  // ✨ AI-generated summary!
}
```

## 🏗️ Architecture

```
User Input → React Frontend → Express Backend → Hunter.io API
                                              → OpenAI API (summaries)
                                              → Firebase (auth & storage)
```

## 📚 Documentation

- **PROJECT_FILE_STRUCTURE.md** - Complete architecture and file structure guide
- **backend/AI_SUMMARIES_GUIDE.md** - AI summary feature documentation
- **backend/ENVIRONMENT_VARIABLES.md** - Environment configuration guide

## 🧪 Testing

### Test Contact Search with Summaries
```bash
cd backend
node test-hunter-with-summaries.js
```

### Test Backend API
```bash
cd backend
npm run dev

# In another terminal
curl http://localhost:8080/api/hello
```

## 💰 Cost Considerations

- **Hunter.io**: $49-$399/month (based on plan)
- **OpenAI**: ~$0.001-$0.002 per contact summary (very affordable!)
- **Firebase**: Free tier available, scales as needed

**Example**: Finding 10 contacts with summaries costs ~$0.01-$0.02 in OpenAI fees.

## 🔒 Security

- ✅ Firebase Authentication for user management
- ✅ Protected API endpoints with token verification
- ✅ API keys stored in environment variables (never committed)
- ✅ CORS configuration for allowed origins
- ✅ Input validation on all endpoints

## 🚢 Deployment

### Backend (Cloud Run)
```bash
firebase deploy --only apphosting
```

### Frontend (Choose one)
- Firebase Hosting: `firebase deploy --only hosting`
- Vercel: `vercel deploy`
- Netlify: `netlify deploy`

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- Firebase Client SDK
- React Router

**Backend:**
- Node.js + Express
- Firebase Admin SDK
- Hunter.io API
- OpenAI API

## 📝 Environment Variables

### Backend (`backend/.env`)
```bash
PORT=8080
HUNTER_API_KEY=your-hunter-api-key
OPENAI_API_KEY=your-openai-api-key
```

### Frontend (`frontend/.env.local`)
```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_BACKEND_URL=http://localhost:8080
```

## 🆘 Troubleshooting

**"HUNTER_API_KEY is not set"**
- Create `backend/.env` file
- Add your Hunter.io API key

**"OPENAI_API_KEY is not set"**
- Add your OpenAI API key to `backend/.env`
- Get key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**CORS errors**
- Update `allowedOrigins` in `backend/index.js`
- Add your frontend URL

**No contacts found**
- Check your Hunter.io API quota
- Try a well-known company (Google, Stripe, Microsoft)

## 📖 Next Steps

1. ✅ Set up environment variables
2. ✅ Test backend with `node test-hunter-with-summaries.js`
3. Build SourceInput component for contact search
4. Build ContactCard component to display contacts with summaries
5. Implement accept/reject workflow
6. Add email template functionality
7. Integrate Gmail API for sending

## 🤝 Contributing

Follow the architecture defined in `PROJECT_FILE_STRUCTURE.md`:
- Use functional programming principles
- Keep components small and focused
- Write pure functions where possible
- Add tests for new features

## 📄 License

MIT

---

**Built with ❤️ for efficient outreach automation**
