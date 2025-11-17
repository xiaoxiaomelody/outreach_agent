# Backend API

Backend server for the outreach application using Firebase Admin SDK and Express with Authentication.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run in production mode
npm start
```

## Project Structure

```
backend/
├── index.js          # Main server file
├── package.json      # Dependencies
├── test-auth.js      # Authentication test script
└── .gitignore
```

## Testing

Run the test script to verify authentication:

```bash
node test-auth.js
```

## Deployment

Deploy to Firebase App Hosting:

```bash
# From project root
firebase deploy --only apphosting
```

## Documentation

See the main README.md in the project root for:
- Complete API documentation
- Authentication setup guide
- Frontend integration examples
- Security best practices

See FRONTEND_INTEGRATION.md for:
- Step-by-step frontend setup
- Code examples
- Common issues and solutions

