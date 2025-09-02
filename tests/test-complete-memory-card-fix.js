const axios = require('axios');
const User = require('../server/models/User');
require('dotenv').config();

class CompleteMemoryCardFixTester {
  constructor() {
    this.baseURL = process.env.CLIENT_URL || 'http://localhost:3000';
    this.apiURL = `http://localhost:${process.env.PORT || 5000}/api`;
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addResult(testName, passed, details = '') {
    this.testResults.details.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
    
    if (passed) {
      this.testResults.passed++;
      this.log(`${testName}: PASSED ${details}`, 'success');
    } else {
      this.testResults.failed++;
      this.log(`${testName}: FAILED ${details}`, 'error');
    }
  }

  async testServerConnection() {
    try {
      const response = await axios.get(`${this.apiURL}/health`, { timeout: 5000 });
      this.addResult('Server Connection', true, `Server responded with status ${response.status}`);
      return true;
    } catch (error) {
      this.addResult('Server Connection', false, `Server not responding: ${error.message}`);
      return false;
    }
  }

  async testUserAuthentication() {
    try {
      // Get a test user from database
      const user = await User.findById(1);
      if (!user) {
        this.addResult('User Authentication', false, 'No test user found in database');
        return null;
      }

      // Generate a fresh token
      const token = user.generateToken();
      this.log(`Generated token for user ${user.email} (ID: ${user.id})`);

      // Test token validation with a simple endpoint
      try {
        const response = await axios.get(`${this.apiURL}/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.status === 200) {
          this.addResult('User Authentication', true, `Token validated successfully for user ${user.email}`);
          return { user, token };
        } else {
          this.addResult('User Authentication', false, `Unexpected response status: ${response.status}`);
          return null;
        }
      } catch (authError) {
        // If /auth/validate doesn't exist, that's okay - we'll test with memory cards endpoint
        this.log(`Auth validation endpoint not available, will test with memory cards endpoint`, 'warning');
        return { user, token };
      }
    } catch (error) {
      this.addResult('User Authentication', false, `Authentication test failed: ${error.message}`);
      return null;
    }
  }

  async testMemoryCardSetCreation(authData) {
    if (!authData) {
      this.addResult('Memory Card Set Creation', false, 'No authentication data available');
      return null;
    }

    const { user, token } = authData;

    try {
      const testSetData = {
        name: `Test Memory Card Set ${Date.now()}`,
        description: 'Automated test set for authentication fix validation',
        userId: user.id,
        subjectArea: 'Computer Science',
        gradeLevel: '10th',
        isPublic: false
      };

      this.log(`Attempting to create memory card set: ${testSetData.name}`);

      const response = await axios.post(`${this.apiURL}/memory-cards/sets`, testSetData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.status === 201 && response.data.success) {
        this.addResult('Memory Card Set Creation', true, `Set created successfully: ${response.data.data.name}`);
        return response.data.data;
      } else {
        this.addResult('Memory Card Set Creation', false, `Unexpected response: ${JSON.stringify(response.data)}`);
        return null;
      }
    } catch (error) {
      let errorDetails = error.message;
      
      if (error.response) {
        errorDetails = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
        
        // Log detailed error information for debugging
        this.log(`Response Status: ${error.response.status}`, 'error');
        this.log(`Response Headers: ${JSON.stringify(error.response.headers)}`, 'error');
        this.log(`Response Data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      
      this.addResult('Memory Card Set Creation', false, errorDetails);
      return null;
    }
  }

  async testMemoryCardCreation(authData, setData) {
    if (!authData || !setData) {
      this.addResult('Memory Card Creation', false, 'Missing authentication or set data');
      return null;
    }

    const { user, token } = authData;

    try {
      const testCardData = {
        userId: user.id,
        setId: setData.id,
        frontText: 'What is the capital of France?',
        backText: 'Paris',
        cardType: 'text',
        difficultyLevel: 'easy',
        tags: ['geography', 'capitals', 'europe']
      };

      this.log(`Attempting to create memory card in set ${setData.id}`);

      const response = await axios.post(`${this.apiURL}/memory-cards`, testCardData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.status === 201 && response.data.success) {
        this.addResult('Memory Card Creation', true, `Card created successfully: ${response.data.data.frontText}`);
        return response.data.data;
      } else {
        this.addResult('Memory Card Creation', false, `Unexpected response: ${JSON.stringify(response.data)}`);
        return null;
      }
    } catch (error) {
      let errorDetails = error.message;
      
      if (error.response) {
        errorDetails = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      }
      
      this.addResult('Memory Card Creation', false, errorDetails);
      return null;
    }
  }

  async testMemoryCardRetrieval(authData, setData) {
    if (!authData || !setData) {
      this.addResult('Memory Card Retrieval', false, 'Missing authentication or set data');
      return;
    }

    const { user, token } = authData;

    try {
      this.log(`Attempting to retrieve memory card set ${setData.id}`);

      const response = await axios.get(`${this.apiURL}/memory-cards/sets/${setData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.status === 200 && response.data.success) {
        const retrievedSet = response.data.data;
        this.addResult('Memory Card Retrieval', true, `Set retrieved successfully: ${retrievedSet.name} with ${retrievedSet.cards ? retrievedSet.cards.length : 0} cards`);
      } else {
        this.addResult('Memory Card Retrieval', false, `Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      let errorDetails = error.message;
      
      if (error.response) {
        errorDetails = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      }
      
      this.addResult('Memory Card Retrieval', false, errorDetails);
    }
  }

  async testInvalidTokenHandling() {
    try {
      const testSetData = {
        name: 'Test Set with Invalid Token',
        description: 'This should fail',
        userId: 1,
        subjectArea: 'Test',
        gradeLevel: '1st',
        isPublic: false
      };

      this.log('Testing invalid token handling...');

      const response = await axios.post(`${this.apiURL}/memory-cards/sets`, testSetData, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      // If we get here, the test failed because invalid token should be rejected
      this.addResult('Invalid Token Handling', false, `Invalid token was accepted: ${response.status}`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const errorData = error.response.data;
        if (errorData.code === 'INVALID_TOKEN') {
          this.addResult('Invalid Token Handling', true, `Invalid token correctly rejected with code: ${errorData.code}`);
        } else {
          this.addResult('Invalid Token Handling', false, `Wrong error code: ${errorData.code}`);
        }
      } else {
        this.addResult('Invalid Token Handling', false, `Unexpected error: ${error.message}`);
      }
    }
  }

  async testMissingTokenHandling() {
    try {
      const testSetData = {
        name: 'Test Set without Token',
        description: 'This should fail',
        userId: 1,
        subjectArea: 'Test',
        gradeLevel: '1st',
        isPublic: false
      };

      this.log('Testing missing token handling...');

      const response = await axios.post(`${this.apiURL}/memory-cards/sets`, testSetData, {
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header
        },
        timeout: 10000
      });

      // If we get here, the test failed because missing token should be rejected
      this.addResult('Missing Token Handling', false, `Missing token was accepted: ${response.status}`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const errorData = error.response.data;
        if (errorData.code === 'MISSING_TOKEN') {
          this.addResult('Missing Token Handling', true, `Missing token correctly rejected with code: ${errorData.code}`);
        } else {
          this.addResult('Missing Token Handling', false, `Wrong error code: ${errorData.code}`);
        }
      } else {
        this.addResult('Missing Token Handling', false, `Unexpected error: ${error.message}`);
      }
    }
  }

  async cleanup(setData) {
    if (!setData) return;

    try {
      // Get a fresh token for cleanup
      const user = await User.findById(1);
      if (!user) return;

      const token = user.generateToken();

      this.log(`Cleaning up test set ${setData.id}...`);

      await axios.delete(`${this.apiURL}/memory-cards/sets/${setData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      this.log('Cleanup completed successfully', 'success');
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'warning');
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🏁 MEMORY CARD AUTHENTICATION FIX TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${this.testResults.passed}`);
    console.log(`❌ Tests Failed: ${this.testResults.failed}`);
    console.log(`📊 Success Rate: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.testResults.details.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Memory card authentication is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please review the details above.');
    }
  }

  async runAllTests() {
    console.log('🚀 STARTING COMPLETE MEMORY CARD AUTHENTICATION FIX TEST');
    console.log('=' .repeat(70));
    
    let authData = null;
    let setData = null;

    try {
      // Test 1: Server Connection
      const serverConnected = await this.testServerConnection();
      if (!serverConnected) {
        this.log('Server is not running. Please start the server with: npm run dev', 'error');
        this.printSummary();
        return;
      }

      // Test 2: User Authentication
      authData = await this.testUserAuthentication();

      // Test 3: Memory Card Set Creation
      if (authData) {
        setData = await this.testMemoryCardSetCreation(authData);
      }

      // Test 4: Memory Card Creation
      if (authData && setData) {
        await this.testMemoryCardCreation(authData, setData);
      }

      // Test 5: Memory Card Retrieval
      if (authData && setData) {
        await this.testMemoryCardRetrieval(authData, setData);
      }

      // Test 6: Invalid Token Handling
      await this.testInvalidTokenHandling();

      // Test 7: Missing Token Handling
      await this.testMissingTokenHandling();

    } catch (error) {
      this.log(`Test suite failed with error: ${error.message}`, 'error');
    } finally {
      // Cleanup
      if (setData) {
        await this.cleanup(setData);
      }
      
      this.printSummary();
    }
  }
}

// Run the tests
async function main() {
  const tester = new CompleteMemoryCardFixTester();
  await tester.runAllTests();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CompleteMemoryCardFixTester;
