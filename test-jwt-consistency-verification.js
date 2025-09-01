/**
 * JWT Consistency Verification Test
 * Verifies that all components use the same JWT secret and token handling
 */

const path = require('path');
const jwt = require('jsonwebtoken');

// Load environment variables
require('dotenv').config();

console.log('🔐 JWT Consistency Verification Test');
console.log('=====================================');

// Test configuration
const testUser = {
  id: 1,
  email: 'test@example.com',
  role: 'teacher',
  firstName: 'Test',
  lastName: 'User',
  school_id: 1
};

async function verifyJWTConsistency() {
  try {
    console.log('\n1️⃣ Environment Variables Check');
    console.log('--------------------------------');
    
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN;
    
    console.log(`JWT_SECRET: ${jwtSecret ? jwtSecret.substring(0, 20) + '...' : 'NOT SET'}`);
    console.log(`JWT_SECRET length: ${jwtSecret ? jwtSecret.length : 0}`);
    console.log(`JWT_EXPIRES_IN: ${jwtExpiresIn || 'NOT SET'}`);
    
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not found in environment variables');
      return false;
    }

    console.log('\n2️⃣ Server-side JWT Token Generation (User Model)');
    console.log('--------------------------------------------------');
    
    // Import User model to test token generation
    const User = require('./server/models/User');
    
    // Create a mock user instance
    const mockUser = {
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      schoolId: testUser.school_id,
      generateToken: User.prototype.generateToken
    };
    
    const serverToken = mockUser.generateToken();
    console.log(`✅ Server token generated: ${serverToken.substring(0, 50)}...`);
    console.log(`Server token length: ${serverToken.length}`);
    
    console.log('\n3️⃣ Server-side JWT Token Verification (User Model)');
    console.log('----------------------------------------------------');
    
    try {
      const decodedServerToken = User.verifyToken(serverToken);
      console.log('✅ Server token verification successful');
      console.log('Decoded payload:', {
        id: decodedServerToken.id,
        email: decodedServerToken.email,
        role: decodedServerToken.role,
        school_id: decodedServerToken.school_id,
        exp: new Date(decodedServerToken.exp * 1000).toISOString()
      });
    } catch (error) {
      console.error('❌ Server token verification failed:', error.message);
      return false;
    }

    console.log('\n4️⃣ Direct JWT Library Token Generation');
    console.log('---------------------------------------');
    
    const directToken = jwt.sign(testUser, jwtSecret, {
      expiresIn: jwtExpiresIn || '24h'
    });
    
    console.log(`✅ Direct token generated: ${directToken.substring(0, 50)}...`);
    console.log(`Direct token length: ${directToken.length}`);

    console.log('\n5️⃣ Cross-verification Test');
    console.log('---------------------------');
    
    // Verify server token with direct JWT
    try {
      const serverTokenDecoded = jwt.verify(serverToken, jwtSecret);
      console.log('✅ Server token verified with direct JWT library');
    } catch (error) {
      console.error('❌ Server token failed direct JWT verification:', error.message);
      return false;
    }
    
    // Verify direct token with User model
    try {
      const directTokenDecoded = User.verifyToken(directToken);
      console.log('✅ Direct token verified with User model');
    } catch (error) {
      console.error('❌ Direct token failed User model verification:', error.message);
      return false;
    }

    console.log('\n6️⃣ Authentication Middleware Test');
    console.log('----------------------------------');
    
    // Test the authentication middleware logic
    const authMiddleware = require('./server/middleware/auth');
    
    // Mock request and response objects
    const mockReq = {
      headers: {
        authorization: `Bearer ${serverToken}`
      },
      originalUrl: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: () => 'test-user-agent'
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Auth middleware returned status ${code}:`, data);
          return false;
        }
      })
    };
    
    let authSuccess = false;
    const mockNext = () => {
      authSuccess = true;
      console.log('✅ Authentication middleware passed');
    };
    
    // Run authentication middleware
    await authMiddleware.authenticate(mockReq, mockRes, mockNext);
    
    if (!authSuccess) {
      console.error('❌ Authentication middleware failed');
      return false;
    }

    console.log('\n7️⃣ Client-side Token Manager Compatibility');
    console.log('-------------------------------------------');
    
    // Test token format validation (simulating client-side logic)
    const tokenParts = serverToken.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Token format invalid - should have 3 parts');
      return false;
    }
    
    try {
      // Decode payload (client-side logic)
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      console.log('✅ Client-side token decoding successful');
      console.log('Client-decoded payload:', {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        school_id: payload.school_id
      });
    } catch (error) {
      console.error('❌ Client-side token decoding failed:', error.message);
      return false;
    }

    console.log('\n8️⃣ Token Expiration Check');
    console.log('--------------------------');
    
    const decodedPayload = jwt.decode(serverToken);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decodedPayload.exp - currentTime;
    
    console.log(`Token expires at: ${new Date(decodedPayload.exp * 1000).toISOString()}`);
    console.log(`Time until expiry: ${Math.floor(timeUntilExpiry / 3600)} hours, ${Math.floor((timeUntilExpiry % 3600) / 60)} minutes`);
    
    if (timeUntilExpiry <= 0) {
      console.error('❌ Token is already expired');
      return false;
    }
    
    console.log('✅ Token expiration is valid');

    console.log('\n9️⃣ Final Consistency Check');
    console.log('---------------------------');
    
    // Generate multiple tokens and verify they all work
    const tokens = [];
    for (let i = 0; i < 3; i++) {
      const token = mockUser.generateToken();
      tokens.push(token);
      
      // Verify each token
      try {
        const decoded = User.verifyToken(token);
        console.log(`✅ Token ${i + 1} generated and verified successfully`);
      } catch (error) {
        console.error(`❌ Token ${i + 1} verification failed:`, error.message);
        return false;
      }
    }

    console.log('\n🎉 JWT CONSISTENCY VERIFICATION COMPLETE');
    console.log('=========================================');
    console.log('✅ All components use the same JWT secret');
    console.log('✅ Token generation is consistent');
    console.log('✅ Token verification works across all components');
    console.log('✅ Authentication middleware works correctly');
    console.log('✅ Client-side token handling is compatible');
    console.log('✅ Token expiration is properly configured');
    
    return true;

  } catch (error) {
    console.error('\n❌ JWT Consistency Verification Failed');
    console.error('======================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the verification
verifyJWTConsistency().then(success => {
  if (success) {
    console.log('\n🏆 RESULT: JWT implementation is consistent across all components');
    process.exit(0);
  } else {
    console.log('\n💥 RESULT: JWT implementation has inconsistencies');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Verification test crashed:', error);
  process.exit(1);
});
