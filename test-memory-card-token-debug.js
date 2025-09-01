/**
 * Memory Card Token Debug Test
 * Debug the actual token being sent from client to server
 */

const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

console.log('🔍 Memory Card Token Debug Test');
console.log('=================================');

async function debugMemoryCardToken() {
  try {
    // Simulate the client-side token retrieval
    console.log('\n1️⃣ Simulating Client-side Token Retrieval');
    console.log('-------------------------------------------');
    
    // This simulates what the client does:
    // const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Let's create a test token like the server would
    const User = require('./server/models/User');
    
    const testUser = {
      id: 1,
      email: 'test@example.com',
      role: 'teacher',
      firstName: 'Test',
      lastName: 'User',
      schoolId: 1,
      generateToken: User.prototype.generateToken
    };
    
    const clientToken = testUser.generateToken();
    console.log(`✅ Client token generated: ${clientToken.substring(0, 50)}...`);
    console.log(`Client token length: ${clientToken.length}`);
    
    // Decode the token to see what's inside
    const decoded = jwt.decode(clientToken);
    console.log('Token payload:', {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      school_id: decoded.school_id,
      exp: new Date(decoded.exp * 1000).toISOString()
    });

    console.log('\n2️⃣ Testing Token with Memory Cards Authentication');
    console.log('--------------------------------------------------');
    
    // Import the authentication middleware
    const { authenticate } = require('./server/middleware/auth');
    
    // Mock request object (simulating the client request)
    const mockReq = {
      headers: {
        authorization: `Bearer ${clientToken}`,
        'content-type': 'application/json'
      },
      originalUrl: '/api/memory-cards/sets',
      method: 'POST',
      ip: '127.0.0.1',
      get: (header) => {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        return headers[header] || headers[header.toLowerCase()];
      },
      body: {
        name: 'Test Set',
        description: 'Test Description',
        userId: 1,
        subjectArea: 'Math',
        gradeLevel: '5th',
        isPublic: false
      }
    };
    
    // Mock response object
    let authResult = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          authResult = { status: code, data };
          console.log(`❌ Auth failed with status ${code}:`, data);
          return mockRes;
        }
      })
    };
    
    // Mock next function
    let authSuccess = false;
    const mockNext = () => {
      authSuccess = true;
      console.log('✅ Authentication middleware passed successfully');
    };
    
    // Test the authentication
    await authenticate(mockReq, mockRes, mockNext);
    
    if (authSuccess) {
      console.log('✅ Token is valid for memory cards endpoint');
      console.log('User object set on request:', {
        id: mockReq.user.id,
        email: mockReq.user.email,
        role: mockReq.user.role,
        schoolId: mockReq.user.schoolId
      });
    } else {
      console.log('❌ Authentication failed');
      console.log('Auth result:', authResult);
      return false;
    }

    console.log('\n3️⃣ Testing Actual Memory Cards Route Logic');
    console.log('--------------------------------------------');
    
    // Test the authorization logic from the memory cards route
    const userId = mockReq.body.userId;
    const requestUserId = mockReq.user.id;
    const userRole = mockReq.user.role;
    
    console.log('Authorization check:');
    console.log(`- Request userId: ${userId}`);
    console.log(`- Authenticated user ID: ${requestUserId}`);
    console.log(`- User role: ${userRole}`);
    
    if (requestUserId !== parseInt(userId) && userRole !== 'principal') {
      console.log('❌ Authorization failed: User cannot create sets for another user');
      return false;
    } else {
      console.log('✅ Authorization passed: User can create sets');
    }

    console.log('\n4️⃣ Testing Token Expiration');
    console.log('-----------------------------');
    
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;
    
    if (timeUntilExpiry <= 0) {
      console.log('❌ Token is expired');
      console.log(`Token expired at: ${new Date(decoded.exp * 1000).toISOString()}`);
      console.log(`Current time: ${new Date().toISOString()}`);
      return false;
    } else {
      console.log('✅ Token is not expired');
      console.log(`Time until expiry: ${Math.floor(timeUntilExpiry / 3600)} hours, ${Math.floor((timeUntilExpiry % 3600) / 60)} minutes`);
    }

    console.log('\n5️⃣ Testing Token Verification with Different Methods');
    console.log('-----------------------------------------------------');
    
    // Test with User.verifyToken (what the middleware uses)
    try {
      const userVerified = User.verifyToken(clientToken);
      console.log('✅ User.verifyToken() successful');
    } catch (error) {
      console.log('❌ User.verifyToken() failed:', error.message);
      return false;
    }
    
    // Test with direct jwt.verify
    try {
      const jwtVerified = jwt.verify(clientToken, process.env.JWT_SECRET);
      console.log('✅ jwt.verify() successful');
    } catch (error) {
      console.log('❌ jwt.verify() failed:', error.message);
      return false;
    }

    console.log('\n6️⃣ Testing Client Request Format');
    console.log('----------------------------------');
    
    // Test the exact format the client sends
    const authHeader = mockReq.headers.authorization;
    console.log(`Authorization header: ${authHeader.substring(0, 30)}...`);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid authorization header format');
      return false;
    }
    
    const extractedToken = authHeader.substring(7);
    console.log(`Extracted token length: ${extractedToken.length}`);
    console.log(`Original token length: ${clientToken.length}`);
    
    if (extractedToken !== clientToken) {
      console.log('❌ Token extraction mismatch');
      return false;
    } else {
      console.log('✅ Token extraction successful');
    }

    console.log('\n🎉 MEMORY CARD TOKEN DEBUG COMPLETE');
    console.log('====================================');
    console.log('✅ Token generation works correctly');
    console.log('✅ Token verification works correctly');
    console.log('✅ Authentication middleware works correctly');
    console.log('✅ Authorization logic works correctly');
    console.log('✅ Token format is correct');
    console.log('✅ Token is not expired');
    
    return true;

  } catch (error) {
    console.error('\n❌ Memory Card Token Debug Failed');
    console.error('==================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the debug test
debugMemoryCardToken().then(success => {
  if (success) {
    console.log('\n🏆 RESULT: Token should work with memory cards endpoint');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Check if the actual token in localStorage is valid');
    console.log('2. Check if the user is logged in properly');
    console.log('3. Check browser network tab for the actual request being sent');
    console.log('4. Check server logs for more detailed error information');
    process.exit(0);
  } else {
    console.log('\n💥 RESULT: Token has issues that need to be fixed');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Debug test crashed:', error);
  process.exit(1);
});
