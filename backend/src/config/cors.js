/**
 * CORS Configuration
 */

const cors = require('cors');

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',  // Vite default port
  // Add your production frontend URLs here after deployment:
  // 'https://your-app.vercel.app',
  // 'https://your-custom-domain.com',
];

/**
 * CORS middleware configuration
 */
const corsOptions = {
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
};

module.exports = cors(corsOptions);

