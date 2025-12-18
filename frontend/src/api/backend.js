import { auth } from '../config/firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// Helper function to make authenticated requests
export async function apiCall(endpoint, options = {}) {
  const user = auth.currentUser;
  
  // Build headers - include auth token if user is logged in
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  
  // Add Authorization header only if user exists
  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.warn('Failed to get ID token:', error.message);
      // Continue without auth - backend DEV_MODE will handle it
    }
  } else {
    console.log('No user logged in - making request without auth (DEV_MODE should handle this)');
  }
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// API functions
export const api = {
  // Job listings
  getJobs: (category, timeRange = 'all', jobType = 'internship') => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (timeRange) params.set('timeRange', timeRange);
    if (jobType) params.set('jobType', jobType);
    return apiCall(`/api/jobs?${params.toString()}`);
  },
  getJobCategories: () => apiCall('/api/jobs/categories'),
  getJobStats: (jobType = 'internship') => apiCall(`/api/jobs/stats?jobType=${jobType}`),
  refreshJobs: (jobType = 'internship') => apiCall(`/api/jobs/refresh?jobType=${jobType}`, { method: 'POST' }),
  
  // Get company contacts via Hunter.io
  getCompanyContacts: (company, limit = 4) => {
    const params = new URLSearchParams();
    params.set('company', company);
    params.set('limit', limit.toString());
    return apiCall(`/api/jobs/company-contacts?${params.toString()}`);
  },
  
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
  // Training interactions (save a single interaction to backend local file)
  saveTrainingInteraction: (payload) => apiCall('/api/training/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  // Run training on the backend (triggers the training script and returns trained weights)
  runTraining: () => apiCall('/api/training/run', { method: 'POST' }),
};

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