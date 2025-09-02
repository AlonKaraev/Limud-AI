const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../server/models/User');
require('dotenv').config();

class TokenDebugger {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  // Test JWT secret and basic token operations
  testJWTBasics() {
    console.log('\n=== JWT BASICS TEST ===');
    console.log('JWT_SECRET exists:', !!this.jwtSecret);
    console.log('JWT_SECRET length:', this.jwtSecret.length);
    console.log('JWT_EXPIRES_IN:', this.jwtExpiresIn);
    
    // Test basic token creation and verification
    const testPayload = { id: 1, email: 'test@example.com', role: 'teacher' };
    
    try {
      const token = jwt.sign(testPayload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
      console.log('✅ Token creation successful');
      console.log('Token length:', token.length);
      
      const decoded = jwt.verify(token, this.jwtSecret);
      console.log('✅ Token verification successful');
      console.log('Decoded payload:', decoded);
      
      return token;
    } catch (error) {
      console.log('❌ JWT basics test failed:', error.message);
      return null;
    }
  }

  // Test token expiration scenarios
  testTokenExpiration() {
    console.log('\n=== TOKEN EXPIRATION TEST ===');
    
    try {
      // Create an expired token (1 second expiry)
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'teacher' },
        this.jwtSecret,
        { expiresIn: '1ms' }
      );
      
      // Wait a moment then try to verify
      setTimeout(() => {
        try {
          jwt.verify(expiredToken, this.jwtSecret);
          console.log('❌ Expired token should have failed verification');
        } catch (error) {
          console.log('✅ Expired token correctly rejected:', error.message);
        }
      }, 10);
      
    } catch (error) {
      console.log('❌ Token expiration test failed:', error.message);
    }
  }

  // Test User model token methods
  async testUserTokenMethods() {
    console.log('\n=== USER MODEL TOKEN TEST ===');
    
    try {
      // Test User.verifyToken static method
      const testPayload = { id: 1, email: 'test@example.com', role: 'teacher' };
      const token = jwt.sign(testPayload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
      
      const decoded = User.verifyToken(token);
      console.log('✅ User.verifyToken successful');
      console.log('Decoded:', decoded);
      
      // Test invalid token
      try {
        User.verifyToken('invalid-token');
        console.log('❌ Invalid token should have failed');
      } catch (error) {
        console.log('✅ Invalid token correctly rejected:', error.message);
      }
      
    } catch (error) {
      console.log('❌ User token methods test failed:', error.message);
    }
  }

  // Test token format validation
  testTokenFormats() {
    console.log('\n=== TOKEN FORMAT TEST ===');
    
    const validToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'teacher' },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    const testCases = [
      { name: 'Valid Bearer format', header: `Bearer ${validToken}`, shouldPass: true },
      { name: 'Missing Bearer prefix', header: validToken, shouldPass: false },
      { name: 'Wrong prefix', header: `Token ${validToken}`, shouldPass: false },
      { name: 'Empty header', header: '', shouldPass: false },
      { name: 'Only Bearer', header: 'Bearer ', shouldPass: false },
      { name: 'Bearer with invalid token', header: 'Bearer invalid-token', shouldPass: false }
    ];

    testCases.forEach(testCase => {
      console.log(`\nTesting: ${testCase.name}`);
      console.log(`Header: "${testCase.header}"`);
      
      // Simulate auth middleware logic
      if (!testCase.header || !testCase.header.startsWith('Bearer ')) {
        console.log(testCase.shouldPass ? '❌ Should have passed format check' : '✅ Correctly failed format check');
        return;
      }
      
      const token = testCase.header.substring(7);
      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        console.log(testCase.shouldPass ? '✅ Token verification passed' : '❌ Should have failed verification');
      } catch (error) {
        console.log(testCase.shouldPass ? '❌ Token verification failed' : '✅ Correctly failed verification');
        console.log('Error:', error.message);
      }
    });
  }

  // Test database user lookup
  async testUserLookup() {
    console.log('\n=== USER LOOKUP TEST ===');
    
    try {
      // Try to find a user by ID (assuming user with ID 1 exists)
      const user = await User.findById(1);
      if (user) {
        console.log('✅ User lookup successful');
        console.log('User data:', {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          schoolId: user.schoolId
        });
        
        // Test token generation for this user
        const token = user.generateToken();
        console.log('✅ Token generation successful');
        console.log('Generated token length:', token.length);
        
        // Test token verification
        const decoded = User.verifyToken(token);
        console.log('✅ Token verification successful');
        console.log('Token contains school_id:', !!decoded.school_id);
        
        return { user, token };
      } else {
        console.log('⚠️ No user found with ID 1');
        return null;
      }
    } catch (error) {
      console.log('❌ User lookup test failed:', error.message);
      console.log('Stack:', error.stack);
      return null;
    }
  }

  // Simulate the complete auth flow
  async simulateAuthFlow() {
    console.log('\n=== COMPLETE AUTH FLOW SIMULATION ===');
    
    try {
      const userResult = await this.testUserLookup();
      if (!userResult) {
        console.log('❌ Cannot simulate auth flow without valid user');
        return;
      }
      
      const { user, token } = userResult;
      
      // Simulate the auth middleware process
      console.log('\n--- Simulating Auth Middleware ---');
      
      const authHeader = `Bearer ${token}`;
      console.log('Authorization header:', authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('❌ Auth header format check failed');
        return;
      }
      
      const extractedToken = authHeader.substring(7);
      console.log('Extracted token length:', extractedToken.length);
      
      try {
        const decoded = User.verifyToken(extractedToken);
        console.log('✅ Token decoded successfully');
        
        const foundUser = await User.findById(decoded.id);
        if (!foundUser) {
          console.log('❌ User not found in database');
          return;
        }
        
        console.log('✅ User found in database');
        
        if (process.env.NODE_ENV === 'production' && !foundUser.isVerified) {
          console.log('❌ User account not verified (production mode)');
          return;
        }
        
        console.log('✅ Complete auth flow successful');
        console.log('Final user object:', {
          id: foundUser.id,
          email: foundUser.email,
          role: foundUser.role,
          schoolId: foundUser.schoolId,
          isVerified: foundUser.isVerified
        });
        
      } catch (tokenError) {
        console.log('❌ Token verification failed:', tokenError.message);
      }
      
    } catch (error) {
      console.log('❌ Auth flow simulation failed:', error.message);
    }
  }

  // Test memory cards endpoint authorization
  async testMemoryCardsAuth() {
    console.log('\n=== MEMORY CARDS AUTH TEST ===');
    
    try {
      const userResult = await this.testUserLookup();
      if (!userResult) {
        console.log('❌ Cannot test memory cards auth without valid user');
        return;
      }
      
      const { user, token } = userResult;
      
      // Simulate POST /api/memory-cards/sets request
      console.log('\n--- Simulating Memory Cards Set Creation ---');
      
      const requestBody = {
        name: 'Test Memory Card Set',
        description: 'Test description',
        userId: user.id,
        subjectArea: 'Math',
        gradeLevel: '5th',
        isPublic: false
      };
      
      console.log('Request body:', requestBody);
      console.log('User ID from token:', user.id);
      console.log('User ID from request:', requestBody.userId);
      
      // Check authorization logic
      if (user.id !== parseInt(requestBody.userId) && user.role !== 'principal') {
        console.log('❌ Authorization failed: User cannot create sets for another user');
        return;
      }
      
      console.log('✅ Authorization passed for memory cards set creation');
      
    } catch (error) {
      console.log('❌ Memory cards auth test failed:', error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🔍 STARTING COMPREHENSIVE TOKEN DEBUG SESSION');
    console.log('================================================');
    
    this.testJWTBasics();
    this.testTokenExpiration();
    await this.testUserTokenMethods();
    this.testTokenFormats();
    await this.testUserLookup();
    await this.simulateAuthFlow();
    await this.testMemoryCardsAuth();
    
    console.log('\n================================================');
    console.log('🏁 DEBUG SESSION COMPLETE');
  }
}

// Run the debugger
async function main() {
  const tokenDebugger = new TokenDebugger();
  await tokenDebugger.runAllTests();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TokenDebugger;
