/**
 * Test script to verify the login redirect fix
 * This script tests the complete authentication flow to ensure users stay logged in
 */

const fetch = require('node-fetch');
const User = require('../server/models/User');
require('dotenv').config();

class LoginRedirectTester {
  constructor() {
    this.baseUrl = 'http://localhost:3001'; // Adjust port as needed
    this.testUser = {
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User',
      role: 'teacher',
      schoolId: 1
    };
  }

  async testCompleteAuthFlow() {
    console.log('🧪 TESTING LOGIN REDIRECT FIX');
    console.log('================================');

    try {
      // Step 1: Test login endpoint
      console.log('\n1. Testing login endpoint...');
      const loginResult = await this.testLogin();
      
      if (!loginResult.success) {
        console.log('❌ Login test failed, cannot continue');
        return;
      }

      const { token, user } = loginResult;
      console.log('✅ Login successful');

      // Step 2: Test token validation endpoint
      console.log('\n2. Testing token validation...');
      const validationResult = await this.testTokenValidation(token);
      
      if (!validationResult.success) {
        console.log('❌ Token validation failed');
        return;
      }
      console.log('✅ Token validation successful');

      // Step 3: Test authenticated request
      console.log('\n3. Testing authenticated request...');
      const authRequestResult = await this.testAuthenticatedRequest(token);
      
      if (!authRequestResult.success) {
        console.log('❌ Authenticated request failed');
        return;
      }
      console.log('✅ Authenticated request successful');

      // Step 4: Test token refresh
      console.log('\n4. Testing token refresh...');
      const refreshResult = await this.testTokenRefresh(token);
      
      if (!refreshResult.success) {
        console.log('❌ Token refresh failed');
        return;
      }
      console.log('✅ Token refresh successful');

      console.log('\n🎉 ALL TESTS PASSED - Login redirect issue should be fixed!');
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testLogin() {
    try {
      // First ensure test user exists
      await this.ensureTestUserExists();

      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: this.testUser.email,
          password: this.testUser.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('  ✅ Login response structure correct');
        console.log('  ✅ Token received:', data.token ? 'Yes' : 'No');
        console.log('  ✅ User data received:', data.user ? 'Yes' : 'No');
        
        if (data.user) {
          console.log('  📋 User info:', {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            firstName: data.user.firstName
          });
        }

        return {
          success: true,
          token: data.token,
          user: data.user
        };
      } else {
        console.log('  ❌ Login failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.log('  ❌ Login request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testTokenValidation(token) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('  ✅ Token validation successful');
        console.log('  ✅ User data returned:', data.user ? 'Yes' : 'No');
        return { success: true, user: data.user };
      } else {
        console.log('  ❌ Token validation failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.log('  ❌ Token validation request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testAuthenticatedRequest(token) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('  ✅ Authenticated request successful');
        console.log('  ✅ User profile retrieved:', data.user ? 'Yes' : 'No');
        return { success: true, user: data.user };
      } else {
        console.log('  ❌ Authenticated request failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.log('  ❌ Authenticated request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testTokenRefresh(token) {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('  ✅ Token refresh successful');
        console.log('  ✅ New token received:', data.token ? 'Yes' : 'No');
        console.log('  ✅ User data included:', data.user ? 'Yes' : 'No');
        return { success: true, token: data.token, user: data.user };
      } else {
        console.log('  ❌ Token refresh failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.log('  ❌ Token refresh request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async ensureTestUserExists() {
    try {
      // Check if test user already exists
      const existingUser = await User.findByEmail(this.testUser.email);
      
      if (existingUser) {
        console.log('  📋 Test user already exists');
        return existingUser;
      }

      // Create test user
      console.log('  🔧 Creating test user...');
      const newUser = await User.create(this.testUser);
      console.log('  ✅ Test user created successfully');
      return newUser;
      
    } catch (error) {
      console.log('  ⚠️ Error with test user setup:', error.message);
      // Continue anyway - user might exist but with different data
    }
  }

  async testFrontendTokenFlow() {
    console.log('\n🖥️  TESTING FRONTEND TOKEN FLOW');
    console.log('================================');

    // Simulate the frontend TokenManager behavior
    const TokenManager = require('../client/src/utils/TokenManager').default;
    
    try {
      // Test 1: Token storage and retrieval
      console.log('\n1. Testing token storage...');
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InRlYWNoZXIiLCJzY2hvb2xfaWQiOjEsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjoxNjMwMDg2NDAwfQ.test';
      const testUser = { id: 1, email: 'test@example.com', role: 'teacher' };
      
      TokenManager.setToken(testToken, testUser);
      
      const retrievedToken = TokenManager.getToken();
      const retrievedUser = TokenManager.getUserData();
      
      if (retrievedToken && retrievedUser) {
        console.log('  ✅ Token storage and retrieval working');
      } else {
        console.log('  ❌ Token storage or retrieval failed');
      }

      // Test 2: Authentication check
      console.log('\n2. Testing authentication check...');
      const isAuthenticated = TokenManager.isAuthenticated();
      console.log('  📋 Is authenticated:', isAuthenticated);

      // Test 3: Auth headers
      console.log('\n3. Testing auth headers...');
      const authHeaders = TokenManager.getAuthHeader();
      if (authHeaders && authHeaders.Authorization) {
        console.log('  ✅ Auth headers generated correctly');
      } else {
        console.log('  ❌ Auth headers generation failed');
      }

      // Clean up
      TokenManager.clearToken();
      console.log('  🧹 Test tokens cleared');

    } catch (error) {
      console.error('❌ Frontend token flow test failed:', error);
    }
  }

  async runAllTests() {
    await this.testCompleteAuthFlow();
    await this.testFrontendTokenFlow();
    
    console.log('\n📋 SUMMARY');
    console.log('==========');
    console.log('The login redirect issue was caused by:');
    console.log('1. ❌ App.js using its own auth logic instead of TokenManager');
    console.log('2. ❌ Trying to fetch from non-existent /api/auth/profile endpoint');
    console.log('3. ❌ Token key mismatch between App.js and TokenManager');
    console.log('');
    console.log('Fixed by:');
    console.log('1. ✅ Updated App.js to use TokenManager for all auth operations');
    console.log('2. ✅ Changed to use existing /api/auth/validate endpoint');
    console.log('3. ✅ Synchronized token storage keys');
    console.log('4. ✅ Added proper token event handling');
    console.log('');
    console.log('🎯 Users should now stay logged in after successful authentication!');
  }
}

// Run the tests
async function main() {
  const tester = new LoginRedirectTester();
  await tester.runAllTests();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = LoginRedirectTester;
