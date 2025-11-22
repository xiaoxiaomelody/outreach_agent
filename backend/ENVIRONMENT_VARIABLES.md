# Backend Environment Variables Configuration

This document lists all required environment variables for the backend service.

## Setup Instructions

1. Create a `.env` file in the `backend/` directory
2. Copy the variables below and fill in your actual values
3. Never commit the `.env` file to version control

## Required Variables

### Server Configuration
```bash
PORT=8080
```
- Port number for the Express server
- Default: 8080

### OpenAI API Configuration
```bash
OPENAI_API_KEY=your-openai-api-key-here
```
- **Required** for AI features (summaries, email drafting, keyword extraction)
- Get your API key from: https://platform.openai.com/api-keys
- Used for:
  - Generating contact summaries
  - Personalizing email templates
  - Natural language query parsing
  - Hunter.io MCP integration (optional)

### Hunter.io API Configuration
```bash
HUNTER_API_KEY=your-hunter-api-key-here
```
- **Required** for contact search and email finding
- Get your API key from: https://hunter.io/api_keys
- Can be used directly OR through OpenAI's MCP protocol
- Direct API is simpler and more cost-effective (no OpenAI fees)

### Firebase Configuration
```bash
FIREBASE_PROJECT_ID=your-project-id
```
- Usually not needed when using Application Default Credentials in Cloud Run
- Optional for local development

### Gmail API Configuration (Optional)
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```
- Required only if implementing Gmail OAuth for email sending
- Get credentials from: https://console.cloud.google.com/apis/credentials

### Apollo API Configuration (Optional)
```bash
APOLLO_API_KEY=your-apollo-api-key
```
- Alternative to Hunter.io for contact search
- Get your API key from: https://www.apollo.io/

## Example .env File

Create a file named `.env` in the `backend/` directory:

```bash
# Server
PORT=8080

# OpenAI (Required)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Hunter.io (Required)
HUNTER_API_KEY=627abb0bf3e7db9486e0a496b63f254145ccba5c

# Gmail (Optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Apollo (Optional)
APOLLO_API_KEY=your-apollo-api-key
```

## Verifying Configuration

After setting up your `.env` file, you can verify it's loaded correctly:

```bash
# Start the server
npm run dev

# Check console output for any missing variable warnings
```

## Security Notes

⚠️ **Important Security Practices:**
- Never commit `.env` files to git
- Never share API keys publicly
- Rotate API keys regularly
- Use different keys for development and production
- Enable billing alerts for API services to avoid unexpected charges

