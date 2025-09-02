const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('🔍 Server JWT Secret Debug Test');
console.log('===============================');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const CLIENT_JWT_SECRET = process.env.JWT_SECRET || '39586eb47901b8845324a6e36fbd172393309d3a40dbea5f909ed9e2349c9a7b';

console.log('Client-side JWT_SECRET:', CLIENT_JWT_SECRET);
console.log('Client-side JWT_SECRET length:', CLIENT_JWT_SECRET.length);

// Create a test endpoint to check server's JWT secret
async function testServerJWTSecret() {
  try {
    console.log('\n1️⃣ Creating test endpoint to check server JWT secret');
    
    // Let's create a simple test route that shows us what JWT secret the server is using
    const testEndpointCode = `
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();

router.get('/debug-jwt', (req, res) => {
  const serverSecret = process.env.JWT_SECRET || 'your-secret-key';
  const testPayload = { test: 'data', timestamp: Date.now() };
  
  try {
    const token = jwt.sign(testPayload, serverSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, serverSecret);
    
    res.json({
      success: true,
      serverSecretLength: serverSecret.length,
      serverSecretPreview: serverSecret.substring(0, 20) + '...',
      tokenCreated: !!token,
      tokenVerified: !!decoded,
      nodeEnv: process.env.NODE_ENV,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('JWT')),
      testToken: token
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      serverSecretLength: serverSecret.length,
      serverSecretPreview: serverSecret.substring(0, 20) + '...'
    });
  }
});

module.exports = router;
`;

    // Write the test route
    const fs = require('fs');
    fs.writeFileSync('./server/routes/debug.js', testEndpointCode);
    console.log('✅ Created debug route');

    // We need to restart the server or add the route dynamically
    // For now, let's test with a direct approach
    
    console.log('\n2️⃣ Testing server JWT processing directly');
    
    // Let's create a token with the client secret and see what happens
    const testPayload = {
      id: 1,
      email: 'test@1234.com',
      role: 'student',
      firstName: 'אלון',
      lastName: 'קרייב',
      school_id: 1
    };

    const clientToken = jwt.sign(testPayload, CLIENT_JWT_SECRET, { expiresIn: '24h' });
    console.log('Client token created with client secret');

    // Test different possible JWT secrets the server might be using
    const possibleSecrets = [
      CLIENT_JWT_SECRET,
      'your-secret-key', // Default fallback in User.js
      '39586eb47901b8845324a6e36fbd172393309d3a40dbea5f909ed9e2349c9a7b', // From .env.example
      process.env.JWT_SECRET,
      undefined
    ];

    console.log('\n3️⃣ Testing different JWT secrets');
    for (let i = 0; i < possibleSecrets.length; i++) {
      const secret = possibleSecrets[i];
      if (!secret) continue;
      
      console.log(`\nTesting secret ${i + 1}: ${secret.substring(0, 20)}... (length: ${secret.length})`);
      
      try {
        const testToken = jwt.sign(testPayload, secret, { expiresIn: '24h' });
        const decoded = jwt.verify(testToken, secret);
        console.log('✅ Token creation and verification successful with this secret');
        
        // Test this token with the server
        try {
          const response = await axios.post(
            `${BASE_URL}/api/memory-cards/sets`,
            {
              name: 'Test Set',
              description: 'Test',
              userId: 1,
              subjectArea: 'Math',
              gradeLevel: '5th',
              isPublic: false
            },
            {
              headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            }
          );
          
          console.log('🎉 SUCCESS! This JWT secret works with the server!');
          console.log('Working secret:', secret.substring(0, 20) + '...');
          console.log('Response:', response.data);
          break;
          
        } catch (apiError) {
          console.log('❌ Server rejected token with this secret');
          console.log('Status:', apiError.response?.status);
          console.log('Error:', apiError.response?.data?.code);
        }
        
      } catch (jwtError) {
        console.log('❌ JWT error with this secret:', jwtError.message);
      }
    }

    console.log('\n4️⃣ Checking server environment variables');
    // Let's try to make a request to see server debug info
    try {
      const debugResponse = await axios.get(`${BASE_URL}/api/debug-jwt`);
      console.log('Server debug info:', debugResponse.data);
    } catch (error) {
      console.log('Debug endpoint not available (expected)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testServerJWTSecret().then(() => {
  console.log('\n🏁 JWT Secret debug test completed');
}).catch(error => {
  console.error('❌ Test crashed:', error.message);
});
