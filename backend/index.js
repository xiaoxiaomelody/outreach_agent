/**
 * Outreach Agent Backend Server
 * Express server with Firebase Admin SDK
 */

require('dotenv').config();
const express = require('express');
const { initializeFirebase, getFirestore } = require('./src/config/firebase');
const corsMiddleware = require('./src/config/cors');
const { PORT } = require('./src/config/constants');

// Initialize Firebase (skipped in DEV_MODE)
initializeFirebase();
const db = getFirestore(); // null in DEV_MODE

// Initialize Express
const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const { authenticateUser, optionalAuth } = require('./src/middleware/auth');

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

// Import routes
const contactRoutes = require('./src/routes/contact.routes');
const authRoutes = require('./src/routes/auth.routes');
const emailRoutes = require('./src/routes/email.routes');
const nlpSearchRoutes = require('./src/routes/nlp-search.routes');
const chatRoutes = require('./src/routes/chat.routes');
const rankingRoutes = require('./src/routes/ranking.routes');
const trainingRoutes = require('./src/routes/training.routes');
const resumeRoutes = require('./src/routes/resume.routes');
const jobsRoutes = require('./src/routes/jobs.routes');

// Import job scraper service for startup initialization
const jobScraperService = require('./src/services/jobScraper.service');

// Import profile controller for resume upload
const profileController = require('./src/controllers/profile.controller');


// Register Gmail callback route (NO authentication - called by Google)
const authController = require('./src/controllers/auth.controller');
app.get('/api/auth/gmail/callback', authController.handleGmailCallback);

// Register protected routes (WITH authentication)
app.use('/api/contacts', authenticateUser, contactRoutes);
app.use('/api/auth', authenticateUser, authRoutes);
app.use('/api/emails', authenticateUser, emailRoutes);
app.use('/api/search', authenticateUser, nlpSearchRoutes);
app.use('/api/chat', authenticateUser, chatRoutes);
app.use('/api/ranking', authenticateUser, rankingRoutes);
// Allow training saves in DEV/local usage without requiring auth. Uses optionalAuth
// so a signed-in user's `req.user` will still be available when present.
app.use('/api/training', optionalAuth, trainingRoutes);

// Resume upload and RAG analysis routes
app.use('/api/resume', authenticateUser, resumeRoutes);

// Job listings routes (public - no authentication required)
app.use('/api/jobs', jobsRoutes);

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

// Upload and parse resume (PDF)
app.post('/api/user/resume', authenticateUser, profileController.handleResumeUpload);

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
// START SERVER
// ============================================

app.listen(PORT, async () => {
  console.log(`✅ Outreach Agent Backend running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  
  // Initialize job listings data on startup
  try {
    await jobScraperService.initializeJobData();
  } catch (error) {
    console.error('⚠️ Failed to initialize job data:', error.message);
    // Don't crash the server, just log the error
  }
});

