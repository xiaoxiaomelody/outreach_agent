# Frontend Integration Guide

This file shows you exactly how to integrate your frontend with this authenticated backend.

## Quick Start

### 1. Install Firebase in your frontend project

```bash
npm install firebase
```

### 2. Create `src/firebase.js` in your frontend

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDxx8BnzlhHTXmM-yuqUHxoIR-BhQ2E1sM",
  authDomain: "cs32fp-dd790.firebaseapp.com",
  projectId: "cs32fp-dd790",
  storageBucket: "cs32fp-dd790.firebasestorage.app",
  messagingSenderId: "1070896791098",
  appId: "1:1070896791098:web:7eb2175f84bc60687dbf03",
  measurementId: "G-KY0RXYK4SB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { app, auth, analytics };
```

### 3. Create `src/api/backend.js` - API helper

```javascript
import { auth } from '../firebase';

const BACKEND_URL = 'http://localhost:8080'; // Change in production

// Helper function to make authenticated requests
export async function apiCall(endpoint, options = {}) {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated. Please sign in.');
  }
  
  // Get fresh ID token
  const idToken = await user.getIdToken();
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// API functions
export const api = {
  // User profile
  getProfile: () => apiCall('/api/user/profile'),
  
  updateProfile: (data) => apiCall('/api/user/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Data operations
  getData: (collection) => apiCall(`/api/data/${collection}`),
  
  createData: (collection, data) => apiCall(`/api/data/${collection}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  updateData: (collection, id, data) => apiCall(`/api/data/${collection}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  deleteData: (collection, id) => apiCall(`/api/data/${collection}/${id}`, {
    method: 'DELETE',
  }),
};
```

### 4. Create `src/auth/authService.js` - Auth helper

```javascript
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';

// Sign up with email/password
export async function signUp(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

// Sign in with email/password
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

// Sign in with Google
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

// Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
}

// Listen to auth state changes
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser;
}

// Get ID token for current user
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}
```

## Usage Examples

### Example 1: React Login Component

```javascript
import React, { useState } from 'react';
import { signIn, signInWithGoogle } from '../auth/authService';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const { user, error } = await signIn(email, password);
    
    if (error) {
      setError(error);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    const { user, error } = await signInWithGoogle();
    if (error) {
      setError(error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div>
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Sign In</button>
      </form>
      
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default Login;
```

### Example 2: React Auth Context

```javascript
// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, getCurrentUser } from '../auth/authService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
```

### Example 3: Using the API

```javascript
import React, { useState, useEffect } from 'react';
import { api } from '../api/backend';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, postsData] = await Promise.all([
        api.getProfile(),
        api.getData('posts'),
      ]);
      
      setProfile(profileData);
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (title, content) => {
    try {
      const newPost = await api.createData('posts', { title, content });
      setPosts([...posts, newPost]);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const deletePost = async (postId) => {
    try {
      await api.deleteData('posts', postId);
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {currentUser.email}!</p>
      
      <div>
        <h2>Your Posts</h2>
        {posts.map(post => (
          <div key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
            <button onClick={() => deletePost(post.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
```

### Example 4: Protected Route Component

```javascript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default ProtectedRoute;

// Usage in App.js:
// <Route path="/dashboard" element={
//   <ProtectedRoute>
//     <Dashboard />
//   </ProtectedRoute>
// } />
```

## Vanilla JavaScript (No React)

```javascript
// main.js
import { signIn, onAuthChange } from './auth/authService.js';
import { api } from './api/backend.js';

// Listen to auth state
onAuthChange(async (user) => {
  if (user) {
    console.log('User signed in:', user.email);
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    
    // Load user data
    const profile = await api.getProfile();
    console.log('User profile:', profile);
  } else {
    console.log('User signed out');
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('app-section').style.display = 'none';
  }
});

// Sign in form
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  const { user, error } = await signIn(email, password);
  
  if (error) {
    alert(error);
  }
});
```

## Common Errors & Solutions

### Error: "No token provided"
**Cause**: You forgot to include the Authorization header
**Solution**: Make sure you're using the `apiCall` helper function or manually adding the header

### Error: "Invalid or expired token"
**Cause**: The token expired (after 1 hour)
**Solution**: Call `getIdToken()` again - it automatically refreshes

### Error: "User not authenticated"
**Cause**: User is not signed in
**Solution**: Check `auth.currentUser` before making API calls

### Error: "Not authorized to update this document"
**Cause**: Trying to modify data that doesn't belong to the user
**Solution**: Only users can modify their own data (where `userId` matches)

## Testing Checklist

- [ ] User can sign up
- [ ] User can sign in
- [ ] User can sign out
- [ ] Protected routes redirect to login
- [ ] API calls include Authorization header
- [ ] Token automatically refreshes
- [ ] Error messages display properly
- [ ] User can only access their own data

## Production Checklist

- [ ] Change `BACKEND_URL` to your production URL
- [ ] Enable HTTPS only
- [ ] Set up Firebase Security Rules
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Set up error logging (Sentry, etc.)
- [ ] Test token expiration handling

