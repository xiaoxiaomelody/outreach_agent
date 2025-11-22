# Outreach Agent - Project File Structure & Content Guide

## Overview
This document outlines the recommended file structure and content for the Outreach Agent application, following industry best practices for functional programming with React.js (frontend) and Firebase (backend).

## Design Principles
- **Functional Programming**: Pure functions, immutability, composition
- **Separation of Concerns**: Clear boundaries between layers
- **Single Responsibility**: Each file has one clear purpose
- **DRY (Don't Repeat Yourself)**: Reusable utilities and components
- **Scalability**: Structure supports growth and feature additions

---

## 🎨 Frontend Structure (React.js)

```
frontend/
├── public/
│   ├── index.html                 # HTML entry point
│   ├── favicon.ico                # App icon
│   └── manifest.json              # PWA manifest
│
├── src/
│   ├── index.js                   # Application entry point
│   ├── App.js                     # Root component with routing
│   │
│   ├── config/                    # Configuration files
│   │   ├── firebase.js            # Firebase client initialization
│   │   ├── constants.js           # App-wide constants
│   │   └── env.js                 # Environment variables wrapper
│   │
│   ├── api/                       # API layer - backend communication
│   │   ├── backend.js             # General backend API calls
│   │   ├── apollo.js              # Apollo API integration
│   │   ├── openai.js              # OpenAI/LLM API integration
│   │   └── gmail.js               # Gmail API integration
│   │
│   ├── services/                  # Business logic layer
│   │   ├── auth.service.js        # Authentication logic
│   │   ├── contact.service.js     # Contact management logic
│   │   ├── email.service.js       # Email drafting/sending logic
│   │   ├── keyword.service.js     # Keyword extraction logic
│   │   └── preference.service.js  # User preference learning logic
│   │
│   ├── components/                # Reusable UI components
│   │   ├── common/                # Generic reusable components
│   │   │   ├── Button.js          # Custom button component
│   │   │   ├── Input.js           # Custom input component
│   │   │   ├── LoadingSpinner.js  # Loading indicator
│   │   │   ├── Modal.js           # Modal dialog component
│   │   │   ├── ErrorBoundary.js   # Error boundary wrapper
│   │   │   └── Toast.js           # Toast notification
│   │   │
│   │   ├── auth/                  # Authentication components
│   │   │   ├── LoginForm.js       # Email/password login form
│   │   │   ├── SignupForm.js      # Registration form
│   │   │   ├── GoogleAuthButton.js # Google OAuth button
│   │   │   └── ProtectedRoute.js  # Route protection HOC
│   │   │
│   │   ├── sourcing/              # Contact sourcing components
│   │   │   ├── SourceInput.js     # User input for sourcing query
│   │   │   ├── ContactList.js     # List of found contacts
│   │   │   ├── ContactCard.js     # Individual contact card
│   │   │   ├── ContactFilters.js  # Filtering UI
│   │   │   └── LoadingState.js    # "Finding contacts..." state
│   │   │
│   │   ├── email/                 # Email drafting components
│   │   │   ├── TemplateInput.js   # Email template input
│   │   │   ├── EmailList.js       # List of drafted emails
│   │   │   ├── EmailPreview.js    # Individual email preview card
│   │   │   ├── EmailEditor.js     # Edit email before sending
│   │   │   └── SendButton.js      # Send email action button
│   │   │
│   │   └── layout/                # Layout components
│   │       ├── Header.js          # App header with user info
│   │       ├── Sidebar.js         # Navigation sidebar
│   │       ├── SplitPane.js       # Two-column layout for landing
│   │       └── Footer.js          # App footer
│   │
│   ├── pages/                     # Page-level components
│   │   ├── Login.js               # Login/Signup page
│   │   ├── Dashboard.js           # Main landing page
│   │   ├── Session.js             # Individual outreach session page
│   │   ├── SessionHistory.js      # Past sessions view
│   │   └── Profile.js             # User profile settings
│   │
│   ├── utils/                     # Utility functions
│   │   ├── validation.js          # Input validation helpers
│   │   ├── formatting.js          # Data formatting utilities
│   │   ├── array.js               # Array manipulation helpers
│   │   ├── string.js              # String manipulation helpers
│   │   ├── date.js                # Date formatting utilities
│   │   └── error.js               # Error handling utilities
│   │
│   ├── context/                   # React Context providers
│   │   ├── AuthContext.js         # Global auth state
│   │   ├── SessionContext.js      # Current session state
│   │   └── ThemeContext.js        # UI theme state
│   │
│   ├── styles/                    # CSS/styling files
│   │   ├── App.css                # Global styles
│   │   ├── Login.css              # Login page styles
│   │   ├── Dashboard.css          # Dashboard styles
│   │   ├── variables.css          # CSS variables (colors, spacing)
│   │   └── animations.css         # Animation keyframes
│   │
│   ├── assets/                    # Static assets
│   │   ├── images/                # Image files
│   │   ├── icons/                 # Icon files
│   │   └── fonts/                 # Custom fonts
│   │
│   └── tests/                     # Test files
│       ├── unit/                  # Unit tests
│       ├── integration/           # Integration tests
│       └── setup.js               # Test configuration
│
├── package.json                   # Dependencies and scripts
├── vite.config.js                 # Vite configuration
├── .env.example                   # Environment variables template
├── .env.local                     # Local environment variables (gitignored)
└── .gitignore                     # Git ignore rules
```

---

## 🔥 Backend Structure (Firebase/Node.js)

```
backend/
├── src/
│   ├── index.js                   # Main Express server entry point
│   │
│   ├── config/                    # Configuration
│   │   ├── firebase.js            # Firebase Admin SDK initialization
│   │   ├── cors.js                # CORS configuration
│   │   └── constants.js           # Backend constants
│   │
│   ├── middleware/                # Express middleware
│   │   ├── auth.js                # JWT/Firebase token verification
│   │   ├── errorHandler.js        # Global error handler
│   │   ├── rateLimiter.js         # Rate limiting middleware
│   │   └── logger.js              # Request logging
│   │
│   ├── routes/                    # API route definitions
│   │   ├── auth.routes.js         # Auth endpoints
│   │   ├── contact.routes.js      # Contact CRUD endpoints
│   │   ├── email.routes.js        # Email sending endpoints
│   │   ├── session.routes.js      # Session management endpoints
│   │   ├── user.routes.js         # User profile endpoints
│   │   └── index.js               # Route aggregator
│   │
│   ├── controllers/               # Request handlers
│   │   ├── auth.controller.js     # Authentication logic
│   │   ├── contact.controller.js  # Contact operations
│   │   ├── email.controller.js    # Email operations
│   │   ├── session.controller.js  # Session operations
│   │   └── user.controller.js     # User operations
│   │
│   ├── services/                  # Business logic
│   │   ├── apollo.service.js      # Apollo API integration
│   │   ├── openai.service.js      # OpenAI keyword extraction
│   │   ├── gmail.service.js       # Gmail API integration
│   │   ├── preference.service.js  # User preference learning algorithm
│   │   ├── filtering.service.js   # Contact filtering logic
│   │   └── templating.service.js  # Email template generation
│   │
│   ├── models/                    # Data models/schemas
│   │   ├── user.model.js          # User schema
│   │   ├── contact.model.js       # Contact schema
│   │   ├── session.model.js       # Session schema
│   │   ├── email.model.js         # Email schema
│   │   └── preference.model.js    # User preference schema
│   │
│   ├── utils/                     # Utility functions
│   │   ├── validation.js          # Data validation
│   │   ├── formatting.js          # Data formatting
│   │   ├── encryption.js          # Data encryption utilities
│   │   └── logger.js              # Logging utilities
│   │
│   └── db/                        # Database operations
│       ├── firestore.js           # Firestore helper functions
│       ├── queries.js             # Common queries
│       └── transactions.js        # Transaction helpers
│
├── tests/                         # Test files
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   └── setup.js                   # Test configuration
│
├── scripts/                       # Utility scripts
│   ├── seed.js                    # Database seeding
│   ├── migrate.js                 # Data migration
│   └── cleanup.js                 # Cleanup utilities
│
├── package.json                   # Dependencies and scripts
├── .env.example                   # Environment variables template
├── .env.local                     # Local environment (gitignored)
└── .gitignore                     # Git ignore rules
```

---

## 📄 Detailed File Content Specifications

### Frontend Files

#### **src/index.js** - Application Entry Point
```javascript
// Initialize React app
// Wrap with providers (Auth, Theme, etc.)
// Render root component
// Register service worker (optional)
```

#### **src/App.js** - Root Component
```javascript
// Define application routes
// Configure React Router
// Handle global error boundaries
// Setup layout structure
```

#### **src/config/firebase.js** - Firebase Client Configuration
```javascript
// Initialize Firebase client SDK
// Export auth, firestore, storage instances
// Configure Firebase services
```

#### **src/api/backend.js** - Backend API Client
```javascript
// Generic API call function with auth headers
// CRUD operations for all entities
// Error handling wrapper
// Token refresh logic
```

#### **src/api/apollo.js** - Apollo API Integration
```javascript
// Search contacts by criteria
// Extract company/people information
// Rate limiting handling
// Response parsing and formatting
```

#### **src/api/openai.js** - OpenAI/LLM Integration
```javascript
// Keyword extraction from user input
// Email template generation
// Personalization logic
// Prompt engineering utilities
```

#### **src/api/gmail.js** - Gmail API Integration
```javascript
// OAuth flow for Gmail access
// Send email via Gmail API
// Email validation
// Batch sending logic
```

#### **src/services/auth.service.js** - Authentication Service
```javascript
// Login/logout pure functions
// Token management
// User session handling
// OAuth integration helpers
```

#### **src/services/contact.service.js** - Contact Service
```javascript
// Contact search orchestration
// Filter contacts based on criteria
// Sort contacts by relevance
// Accept/reject contact logic
// Store user preferences
```

#### **src/services/email.service.js** - Email Service
```javascript
// Draft personalized emails
// Template variable replacement
// Email validation
// Send email orchestration
```

#### **src/services/keyword.service.js** - Keyword Extraction Service
```javascript
// Parse user input
// Extract search criteria
// Map to API parameters
// Handle ambiguous queries
```

#### **src/services/preference.service.js** - User Preference Learning
```javascript
// Store accept/reject decisions
// Build user preference model
// Improve future recommendations
// Preference-based filtering
```

#### **src/hooks/useAuth.js** - Authentication Hook
```javascript
// Manage auth state
// Login/logout functions
// Current user access
// Auth loading states
```

#### **src/hooks/useContacts.js** - Contact Management Hook
```javascript
// Fetch contacts from API
// Accept/reject actions
// Filter and sort contacts
// Loading/error states
```

#### **src/hooks/useEmailTemplate.js** - Email Template Hook
```javascript
// Store template state
// Generate personalized emails
// Edit drafts
// Validate templates
```

#### **src/components/sourcing/SourceInput.js** - Source Input Component
```javascript
// Text area for user input
// Submit button
// Loading state display
// Input validation
```

#### **src/components/sourcing/ContactList.js** - Contact List Component
```javascript
// Map contacts to ContactCard
// Empty state handling
// Loading skeleton
// Pagination support
```

#### **src/components/sourcing/ContactCard.js** - Contact Card Component
```javascript
// Display contact information
// Accept/Reject buttons
// Highlight matching criteria
// Expand/collapse details
```

#### **src/components/email/TemplateInput.js** - Email Template Input
```javascript
// Rich text editor for template
// Variable placeholder support
// Template preview
// Save template button
```

#### **src/components/email/EmailList.js** - Email List Component
```javascript
// Map emails to EmailPreview
// Bulk actions (send all)
// Empty state
// Loading states
```

#### **src/components/email/EmailPreview.js** - Email Preview Card
```javascript
// Show recipient info
// Display drafted email
// Edit button
// Send/Remove buttons
```

#### **src/pages/Login.js** - Login Page
```javascript
// Email/password form
// Google sign-in button
// Sign up toggle
// Error messaging
// Redirect after login
```

#### **src/pages/Dashboard.js** - Main Landing Page
```javascript
// Two-column layout (sourcing + email)
// Session management
// Navbar with user info
// New session button
```

#### **src/utils/validation.js** - Validation Utilities
```javascript
// Email validation
// Input sanitization
// Required field checks
// Pure validation functions
```

#### **src/context/AuthContext.js** - Auth Context Provider
```javascript
// Global auth state
// User object
// Authentication methods
// Protected route logic
```

### Backend Files

#### **src/index.js** - Express Server Entry
```javascript
// Initialize Express app
// Setup middleware (CORS, JSON, auth)
// Register routes
// Start server
// Error handling
```

#### **src/middleware/auth.js** - Authentication Middleware
```javascript
// Verify Firebase ID tokens
// Extract user from token
// Attach user to request
// Handle auth errors
```

#### **src/routes/contact.routes.js** - Contact Routes
```javascript
// POST /api/contacts/search - Search contacts
// GET /api/contacts/:id - Get contact details
// POST /api/contacts/:id/accept - Accept contact
// POST /api/contacts/:id/reject - Reject contact
// GET /api/contacts/accepted - Get accepted contacts
```

#### **src/routes/email.routes.js** - Email Routes
```javascript
// POST /api/emails/draft - Generate email draft
// POST /api/emails/send - Send email
// POST /api/emails/batch-send - Send multiple emails
// GET /api/emails/history - Email send history
```

#### **src/routes/session.routes.js** - Session Routes
```javascript
// POST /api/sessions - Create new session
// GET /api/sessions - List user sessions
// GET /api/sessions/:id - Get session details
// PUT /api/sessions/:id - Update session
// DELETE /api/sessions/:id - Delete session
```

#### **src/controllers/contact.controller.js** - Contact Controller
```javascript
// Handle contact search requests
// Validate input parameters
// Call Apollo service
// Filter and format results
// Store in Firestore
```

#### **src/services/apollo.service.js** - Apollo Service
```javascript
// Build API query from keywords
// Make HTTP request to Apollo
// Parse response
// Handle errors and rate limits
```

#### **src/services/openai.service.js** - OpenAI Service
```javascript
// Extract keywords from natural language
// Generate personalized email content
// Handle API rate limits
// Prompt engineering
```

#### **src/services/gmail.service.js** - Gmail Service
```javascript
// OAuth token management
// Send email via Gmail API
// Handle authentication
// Batch operations
```

#### **src/services/preference.service.js** - Preference Learning
```javascript
// Store user accept/reject actions
// Build preference profile
// Weight features (industry, location, etc.)
// Improve future filtering
```

#### **src/services/filtering.service.js** - Contact Filtering
```javascript
// Remove irrelevant contacts
// Apply user preference model
// Sort by relevance score
// Deduplicate contacts
```

#### **src/services/templating.service.js** - Email Templating
```javascript
// Replace template variables
// Personalize content based on contact
// Generate subject lines
// Validate template syntax
```

#### **src/models/user.model.js** - User Data Model
```javascript
// User schema definition
// uid (Firebase Auth ID)
// email, displayName
// gmailToken (encrypted)
// preferences object
// createdAt, updatedAt
```

#### **src/models/contact.model.js** - Contact Data Model
```javascript
// Contact schema
// name, email, company, industry
// location, description
// source (Apollo, etc.)
// status (pending/accepted/rejected)
// userId, sessionId
```

#### **src/models/session.model.js** - Session Data Model
```javascript
// Session schema
// sessionId, userId
// query (user input)
// emailTemplate
// contacts array
// createdAt, status
```

#### **src/models/email.model.js** - Email Data Model
```javascript
// Email schema
// recipientEmail, recipientName
// subject, body
// status (draft/sent/failed)
// sentAt, sessionId, userId
```

#### **src/db/firestore.js** - Firestore Helpers
```javascript
// Generic CRUD operations
// Batch operations
// Transaction helpers
// Query builders
```

---

## 🗄️ Firebase Database Structure

```
Firestore Collections:

/users/{userId}
  - email: string
  - displayName: string
  - gmailToken: string (encrypted)
  - preferences: object
  - createdAt: timestamp
  - updatedAt: timestamp

/sessions/{sessionId}
  - userId: string
  - query: string (user input)
  - emailTemplate: string
  - status: string (active/completed)
  - createdAt: timestamp
  - updatedAt: timestamp

/contacts/{contactId}
  - userId: string
  - sessionId: string
  - name: string
  - email: string
  - company: string
  - industry: string
  - location: string
  - description: string
  - source: string
  - status: string (pending/accepted/rejected)
  - relevanceScore: number
  - createdAt: timestamp

/emails/{emailId}
  - userId: string
  - sessionId: string
  - contactId: string
  - recipientEmail: string
  - recipientName: string
  - subject: string
  - body: string
  - status: string (draft/sent/failed)
  - sentAt: timestamp
  - createdAt: timestamp

/userPreferences/{userId}
  - acceptedFeatures: map
    - industries: array
    - locations: array
    - companies: array
  - rejectedFeatures: map
  - weights: map
  - updatedAt: timestamp
```

---

## 🔑 Key Functional Programming Principles

### 1. **Pure Functions**
- Functions return same output for same input
- No side effects
- Predictable and testable

```javascript
// ✅ Good - Pure function
const calculateRelevanceScore = (contact, preferences) => {
  let score = 0;
  if (preferences.industries.includes(contact.industry)) score += 10;
  if (preferences.locations.includes(contact.location)) score += 5;
  return score;
};

// ❌ Bad - Impure function (modifies external state)
let totalScore = 0;
const calculateScore = (contact) => {
  totalScore += contact.score; // Side effect
  return totalScore;
};
```

### 2. **Immutability**
- Don't mutate data structures
- Use spread operators, Object.assign, or libraries like Immer

```javascript
// ✅ Good - Immutable update
const acceptContact = (contacts, contactId) => 
  contacts.map(contact => 
    contact.id === contactId 
      ? { ...contact, status: 'accepted' }
      : contact
  );

// ❌ Bad - Mutates array
const acceptContact = (contacts, contactId) => {
  const contact = contacts.find(c => c.id === contactId);
  contact.status = 'accepted'; // Mutation
  return contacts;
};
```

### 3. **Function Composition**
- Build complex operations from simple functions
- Enhance reusability and readability

```javascript
// Pure helper functions
const filterByIndustry = industry => contact => 
  contact.industry === industry;

const sortByRelevance = (a, b) => 
  b.relevanceScore - a.relevanceScore;

const limit = n => array => 
  array.slice(0, n);

// Compose them
const getTopContacts = (contacts, industry, n) => 
  limit(n)(
    contacts
      .filter(filterByIndustry(industry))
      .sort(sortByRelevance)
  );
```

### 4. **Higher-Order Functions**
- Functions that take or return functions
- Enables powerful abstractions

```javascript
// Higher-order function
const withLoading = (apiCall) => async (...args) => {
  setLoading(true);
  try {
    const result = await apiCall(...args);
    return result;
  } finally {
    setLoading(false);
  }
};

// Usage
const searchContactsWithLoading = withLoading(searchContacts);
```

### 5. **Declarative over Imperative**
- Focus on "what" not "how"
- Use map, filter, reduce instead of loops

```javascript
// ✅ Declarative
const acceptedEmails = contacts
  .filter(contact => contact.status === 'accepted')
  .map(contact => contact.email);

// ❌ Imperative
const acceptedEmails = [];
for (let i = 0; i < contacts.length; i++) {
  if (contacts[i].status === 'accepted') {
    acceptedEmails.push(contacts[i].email);
  }
}
```

---

## 🚀 Implementation Workflow

### Phase 1: Foundation
1. ✅ Setup Firebase (Auth, Firestore)
2. ✅ Create basic Express backend
3. ✅ Build authentication pages
4. ✅ Implement protected routing

### Phase 2: Sourcing Feature
1. Create SourceInput component
2. Implement keyword extraction service (OpenAI)
3. Integrate Apollo API service
4. Build ContactList and ContactCard components
5. Implement accept/reject logic
6. Store user preferences

### Phase 3: Email Feature
1. Create TemplateInput component
2. Implement email drafting service
3. Build EmailList and EmailPreview components
4. Integrate Gmail API
5. Implement send functionality
6. Add batch sending

### Phase 4: Session Management
1. Create session model and routes
2. Save/load session state
3. Session history page
4. Multi-session support

### Phase 5: Enhancement
1. User preference learning algorithm
2. Improved filtering based on history
3. Email analytics
4. UI polish and animations

---

## 📦 Key Dependencies

### Frontend
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "firebase": "^10.x",
  "axios": "^1.x"
}
```

### Backend
```json
{
  "express": "^4.x",
  "firebase-admin": "^12.x",
  "cors": "^2.x",
  "dotenv": "^16.x",
  "axios": "^1.x",
  "openai": "^4.x",
  "googleapis": "^128.x"
}
```

---

## 🔒 Environment Variables

### Frontend (.env.local)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_BACKEND_URL=http://localhost:8080
```

### Backend (.env.local)
```
PORT=8080
FIREBASE_PROJECT_ID=
APOLLO_API_KEY=
OPENAI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## 📚 Best Practices Summary

1. **Component Design**
   - Keep components small and focused
   - Use functional components with hooks
   - Separate presentational and container components

2. **State Management**
   - Use React hooks (useState, useReducer)
   - Context API for global state
   - Avoid prop drilling

3. **API Layer**
   - Centralize API calls in service files
   - Handle errors consistently
   - Implement retry logic for failed requests

4. **Code Organization**
   - Group by feature when possible
   - Keep related files together
   - Use index.js for clean imports

5. **Testing**
   - Write unit tests for utilities and services
   - Integration tests for API endpoints
   - Component tests for UI logic

6. **Performance**
   - Lazy load routes and large components
   - Memoize expensive computations
   - Debounce user inputs

7. **Security**
   - Never expose API keys in frontend
   - Validate all user inputs
   - Use Firebase security rules
   - Implement rate limiting

---

## 📝 Notes

- This structure supports scalability and maintainability
- Follows React and Node.js best practices
- Emphasizes functional programming principles
- Designed for team collaboration
- Easy to test and debug

For questions or clarifications, refer to the PRD and technical specifications.

