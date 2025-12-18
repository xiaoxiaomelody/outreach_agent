/**
 * Test Script for SSE Email Stream Endpoint
 * 
 * Tests the POST /api/emails/stream-draft endpoint
 * 
 * Usage: node scripts/test-email-stream.js
 */

require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// Mock user profile (simulating what would be in Firestore)
const mockUserProfile = {
  fullName: 'Alex Chen',
  currentRole: 'Senior Software Engineer',
  yearsOfExperience: 6,
  summary: 'Full-stack engineer with 6 years of experience building scalable web applications. Specialized in React, Node.js, and cloud architecture. Led multiple successful product launches at fast-growing startups.',
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'PostgreSQL', 'GraphQL', 'Docker', 'Kubernetes'],
  experiences: [
    { 
      company: 'TechStartup Inc', 
      role: 'Senior Software Engineer', 
      highlights: 'Led frontend architecture redesign, improving performance by 40%' 
    },
    { 
      company: 'BigCorp Solutions', 
      role: 'Software Engineer', 
      highlights: 'Built real-time data pipeline processing 1M+ events/day' 
    }
  ]
};

// Test request body
const testRequestBody = {
  recipient_info: {
    company_name: 'Google',
    job_title: 'Senior Software Engineer',
    recipient_name: 'Sarah Johnson',
    recipient_role: 'Engineering Manager'
  },
  tone: 'Confident',
  job_description: 'We are looking for a Senior Software Engineer to join our Cloud Platform team. You will work on large-scale distributed systems serving millions of users. Required: 5+ years experience, expertise in JavaScript/TypeScript, experience with cloud platforms.'
};

async function testEmailStream() {
  console.log('🧪 Testing SSE Email Stream Endpoint');
  console.log('=====================================\n');
  console.log('📝 Test Request:');
  console.log(JSON.stringify(testRequestBody, null, 2));
  console.log('\n');

  try {
    // Note: In real usage, you'd need a valid Firebase auth token
    // For DEV_MODE testing, the backend should handle mock authentication
    
    console.log(`📡 Connecting to ${BACKEND_URL}/api/emails/stream-draft...\n`);

    const response = await fetch(`${BACKEND_URL}/api/emails/stream-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In real usage: 'Authorization': `Bearer ${firebaseToken}`
      },
      body: JSON.stringify(testRequestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error ${response.status}:`, errorText);
      return;
    }

    console.log('✅ Connected! Reading SSE stream...\n');
    console.log('--- EMAIL DRAFT OUTPUT ---\n');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('\n\n--- STREAM ENDED ---');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed === 'data: [DONE]') {
          continue;
        }
        
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            
            switch (data.type) {
              case 'start':
                console.log(`🚀 ${data.message}`);
                break;
              case 'content':
                process.stdout.write(data.content);
                fullContent += data.content;
                break;
              case 'finish':
                console.log(`\n\n📋 Finish reason: ${data.finishReason}`);
                break;
              case 'complete':
                console.log('\n✅ Generation complete!');
                console.log(`📊 Metadata:`, data.metadata);
                break;
              case 'error':
                console.error(`\n❌ Error: ${data.error}`);
                break;
            }
          } catch (parseError) {
            // Non-JSON line, ignore
          }
        }
      }
    }

    console.log('\n--- FULL EMAIL CONTENT ---');
    console.log(fullContent);
    console.log(`\n📏 Total length: ${fullContent.length} characters`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testEmailStream().then(() => {
  console.log('\n🏁 Test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});



