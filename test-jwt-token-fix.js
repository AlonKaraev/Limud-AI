const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 JWT Token Debug Test');
console.log('======================');

// Test JWT secret loading
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');
console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'N/A');
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN || '24h');

// Create a test payload (similar to what the User model generates)
const testPayload = {
  id: 4,
  email: 'teacher@tester.com',
  role: 'teacher',
  firstName: 'Test',
  lastName: 'Teacher',
  school_id: 1
};

console.log('\n📝 Test Payload:');
console.log(JSON.stringify(testPayload, null, 2));

try {
  // Generate a complete JWT token
  const token = jwt.sign(testPayload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
  
  console.log('\n✅ Generated JWT Token:');
  console.log('Token length:', token.length);
  console.log('Full token:', token);
  
  // Verify the token
  console.log('\n🔍 Token Verification:');
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
  
  // Test the API call with the complete token
  console.log('\n🌐 Testing API Call:');
  console.log('Command to test:');
  console.log(`node -e "const token = '${token}'; fetch('http://localhost:5000/api/images', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json()).then(d => console.log('Images API Response:', JSON.stringify(d, null, 2))).catch(e => console.error('Error:', e.message));"`);
  
  // Test with fetch if available
  if (typeof fetch !== 'undefined') {
    console.log('\n🚀 Making API call...');
    fetch('http://localhost:5000/api/images', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(r => r.json())
    .then(d => {
      console.log('✅ API Response:', JSON.stringify(d, null, 2));
    })
    .catch(e => {
      console.error('❌ API Error:', e.message);
    });
  }
  
} catch (error) {
  console.error('❌ JWT Error:', error.message);
  console.error('Stack:', error.stack);
}

// Also test the truncated token to show the difference
console.log('\n🔍 Testing Truncated Token (from original command):');
const truncatedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImVtYWlsIjoidGVhY2hlckB0ZXN0ZXIuY29tIiwicm9sZSI6InRlYWNoZXIiLCJpYXQiOjE3MjU0NTI1MDEsImV4cCI6MTcyNTQ2MzMwMX0.fx8NhZUWcObT-60MUBfE';

console.log('Truncated token length:', truncatedToken.length);
console.log('Truncated token:', truncatedToken);

try {
  const decodedTruncated = jwt.verify(truncatedToken, process.env.JWT_SECRET || 'your-secret-key');
  console.log('✅ Truncated token decoded:', JSON.stringify(decodedTruncated, null, 2));
} catch (error) {
  console.log('❌ Truncated token error:', error.message);
  console.log('This confirms the token is incomplete/invalid');
}
