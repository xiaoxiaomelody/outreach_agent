// Backend - Firebase Admin SDK (server-side)
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin SDK
// In production on Cloud Run, this automatically uses Application Default Credentials
admin.initializeApp();

const db = admin.firestore();
const app = express();

// Middleware
// CORS configuration - Update with your frontend URL after deployment
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  // Add your production frontend URL here after deployment:
  // 'https://your-app.vercel.app',
  // 'https://your-custom-domain.com',
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

// Middleware to verify Firebase ID token
async function authenticateUser(req, res, next) {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach user info to request object for use in route handlers
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Optional: Middleware that verifies token but doesn't require it
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
    }
  } catch (error) {
    // Token is invalid, but we don't block the request
    console.warn('Optional auth failed:', error.message);
  }
  next();
}

// ============================================
// PUBLIC ENDPOINTS (No Authentication Required)
// ============================================

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================
// PROTECTED ENDPOINTS (Authentication Required)
// ============================================

// Get current user profile
app.get('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    // req.user is populated by the authenticateUser middleware
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (userDoc.exists) {
      res.json({ uid: req.user.uid, ...userDoc.data() });
    } else {
      // Return basic info from token if no user doc exists
      res.json(req.user);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update current user profile
app.put('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    await db.collection('users').doc(req.user.uid).set(req.body, { merge: true });
    res.json({ uid: req.user.uid, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user-specific data (authenticated)
app.get('/api/data/:collection', authenticateUser, async (req, res) => {
  try {
    const { collection } = req.params;
    // Only get data that belongs to the authenticated user
    const snapshot = await db.collection(collection)
      .where('userId', '==', req.user.uid)
      .limit(100)
      .get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create data (authenticated, auto-adds userId)
app.post('/api/data/:collection', authenticateUser, async (req, res) => {
  try {
    const { collection } = req.params;
    // Automatically add the user's ID to the data
    const dataWithUser = {
      ...req.body,
      userId: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection(collection).add(dataWithUser);
    res.json({ id: docRef.id, ...dataWithUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update data (authenticated, only if owned by user)
app.put('/api/data/:collection/:id', authenticateUser, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if the user owns this document
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this document' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await docRef.update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete data (authenticated, only if owned by user)
app.delete('/api/data/:collection/:id', authenticateUser, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if the user owns this document
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }
    
    await docRef.delete();
    res.json({ message: 'Deleted successfully', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ADMIN ENDPOINTS (Optional - for admin operations)
// ============================================

// Create a new user (admin only - requires custom claims check)
app.post('/api/admin/users', authenticateUser, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    // Create user with Firebase Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });
    
    res.json({ 
      message: 'User created successfully', 
      uid: userRecord.uid,
      email: userRecord.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by UID (admin only)
app.get('/api/admin/users/:uid', authenticateUser, async (req, res) => {
  try {
    const { uid } = req.params;
    const userRecord = await admin.auth().getUser(uid);
    
    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      disabled: userRecord.disabled,
      metadata: userRecord.metadata,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

