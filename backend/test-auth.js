// Test script for authentication
// Run with: node test-auth.js

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:8080';

async function testPublicEndpoints() {
  console.log('\n=== Testing Public Endpoints ===');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/hello`);
    const data = await response.json();
    console.log('✓ /api/hello:', data);
  } catch (error) {
    console.error('✗ /api/hello failed:', error.message);
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    const data = await response.json();
    console.log('✓ /api/health:', data);
  } catch (error) {
    console.error('✗ /api/health failed:', error.message);
  }
}

async function testProtectedEndpointWithoutAuth() {
  console.log('\n=== Testing Protected Endpoint Without Auth ===');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/user/profile`);
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✓ Correctly rejected: No token provided');
    } else {
      console.error('✗ Should have been rejected!');
    }
  } catch (error) {
    console.error('✗ Request failed:', error.message);
  }
}

async function testProtectedEndpointWithFakeToken() {
  console.log('\n=== Testing Protected Endpoint With Invalid Token ===');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
      headers: {
        'Authorization': 'Bearer fake-invalid-token-12345'
      }
    });
    const data = await response.json();
    
    if (response.status === 403) {
      console.log('✓ Correctly rejected: Invalid token');
    } else {
      console.error('✗ Should have been rejected!');
    }
  } catch (error) {
    console.error('✗ Request failed:', error.message);
  }
}

async function runTests() {
  console.log('Starting Authentication Tests...');
  console.log('Make sure your backend is running on', BACKEND_URL);
  
  await testPublicEndpoints();
  await testProtectedEndpointWithoutAuth();
  await testProtectedEndpointWithFakeToken();
  
  console.log('\n=== Tests Complete ===');
  console.log('\nTo test with a REAL token:');
  console.log('1. Sign in a user in your frontend');
  console.log('2. Get the token: await user.getIdToken()');
  console.log('3. Use it in curl:');
  console.log('   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/user/profile');
}

runTests();

