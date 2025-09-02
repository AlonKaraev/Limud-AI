const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test configuration
const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || '39586eb47901b8845324a6e36fbd172393309d3a40dbea5f909ed9e2349c9a7b';

console.log('🔍 Memory Card Authentication Debug Test');
console.log('=====================================');

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  role: 'teacher',
  firstName: 'Test',
  lastName: 'User',
  phone: '0501234567',
  schoolId: 1
};

const testMemoryCardSet = {
  name: 'Test Memory Card Set',
  description: 'A test set for debugging authentication',
  userId: null, // Will be set after login
  subjectArea: 'Mathematics',
  gradeLevel: '5th Grade',
  isPublic: false
};

async function debugAuthentication() {
  try {
    console.log('\n1️⃣ Testing JWT Secret Configuration');
    console.log('JWT_SECRET exists:', !!JWT_SECRET);
    console.log('JWT_SECRET length:', JWT_SECRET.length);
    console.log('JWT_SECRET preview:', JWT_SECRET.substring(0, 20) + '...');

    console.log('\n2️⃣ Creating test token manually');
    const testPayload = {
      id: 1,
      email: testUser.email,
      role: testUser.role,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      school_id: testUser.schoolId
    };

    const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
    console.log('✅ Test token created successfully');
    console.log('Token length:', testToken.length);
    console.log('Token preview:', testToken.substring(0, 50) + '...');

    console.log('\n3️⃣ Verifying test token');
    try {
      const decoded = jwt.verify(testToken, JWT_SECRET);
      console.log('✅ Token verification successful');
      console.log('Decoded payload:', {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (verifyError) {
      console.log('❌ Token verification failed:', verifyError.message);
      return;
    }

    console.log('\n4️⃣ Testing server connection');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/auth/health`, {
        timeout: 5000
      });
      console.log('✅ Server is responding');
    } catch (connectionError) {
      if (connectionError.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running. Please start the server first.');
        console.log('Run: npm run dev');
        return;
      }
      console.log('Server connection test result:', connectionError.response?.status || connectionError.message);
    }

    console.log('\n5️⃣ Testing memory cards endpoint with manual token');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/memory-cards/sets`,
        {
          ...testMemoryCardSet,
          userId: testPayload.id
        },
        {
          headers: {
            'Authorization': `Bearer ${testToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Memory cards endpoint test successful');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
    } catch (apiError) {
      console.log('❌ Memory cards endpoint test failed');
      console.log('Status:', apiError.response?.status);
      console.log('Error data:', apiError.response?.data);
      console.log('Error message:', apiError.message);
      
      if (apiError.response?.status === 401) {
        console.log('\n🔍 Analyzing 401 Unauthorized Error:');
        console.log('- Token format appears correct');
        console.log('- JWT secret matches');
        console.log('- Token verification works locally');
        console.log('- Issue might be in server-side token processing');
        
        console.log('\n🔧 Potential causes:');
        console.log('1. User ID 1 might not exist in database');
        console.log('2. User might not be verified (if in production mode)');
        console.log('3. Database connection issues');
        console.log('4. Middleware order issues');
        console.log('5. Environment variable loading issues on server');
      }
    }

    console.log('\n6️⃣ Testing with different token formats');
    
    // Test with missing Bearer prefix
    try {
      await axios.post(
        `${BASE_URL}/api/memory-cards/sets`,
        { ...testMemoryCardSet, userId: testPayload.id },
        {
          headers: {
            'Authorization': testToken, // Missing "Bearer "
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
    } catch (error) {
      console.log('Expected error for missing Bearer prefix:', error.response?.data?.code);
    }

    // Test with malformed token
    try {
      await axios.post(
        `${BASE_URL}/api/memory-cards/sets`,
        { ...testMemoryCardSet, userId: testPayload.id },
        {
          headers: {
            'Authorization': `Bearer invalid.token.here`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
    } catch (error) {
      console.log('Expected error for invalid token:', error.response?.data?.code);
    }

    console.log('\n7️⃣ Testing token with different JWT secrets');
    const wrongSecretToken = jwt.sign(testPayload, 'wrong-secret', { expiresIn: '24h' });
    try {
      await axios.post(
        `${BASE_URL}/api/memory-cards/sets`,
        { ...testMemoryCardSet, userId: testPayload.id },
        {
          headers: {
            'Authorization': `Bearer ${wrongSecretToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
    } catch (error) {
      console.log('Expected error for wrong JWT secret:', error.response?.data?.code);
    }

    console.log('\n8️⃣ Testing expired token');
    const expiredToken = jwt.sign({...testPayload, exp: Math.floor(Date.now() / 1000) - 3600}, JWT_SECRET);
    try {
      await axios.post(
        `${BASE_URL}/api/memory-cards/sets`,
        { ...testMemoryCardSet, userId: testPayload.id },
        {
          headers: {
            'Authorization': `Bearer ${expiredToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
    } catch (error) {
      console.log('Expected error for expired token:', error.response?.data?.code);
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the debug test
debugAuthentication().then(() => {
  console.log('\n🏁 Debug test completed');
}).catch(error => {
  console.error('❌ Debug test crashed:', error.message);
});
