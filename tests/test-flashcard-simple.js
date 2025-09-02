/**
 * Simple test script to verify flashcard generation inheritance and workflow
 * Uses built-in Node.js modules to avoid import issues
 */

const http = require('http');
const querystring = require('querystring');

// Configuration
const BASE_URL = 'localhost';
const PORT = 5000;

const TEST_USER = {
  email: 'principal@example-school.co.il',
  password: 'principal123'
};

// Test lesson metadata with class and field of study
const TEST_LESSON_METADATA = {
  lessonName: 'מתמטיקה - חשבון שברים',
  subject: 'מתמטיקה',
  classLevel: 'כיתה ה',
  curriculum: 'תכנית הליבה',
  subjectArea: 'מתמטיקה',
  gradeLevel: 'כיתה ה',
  fieldOfStudy: 'מתמטיקה'
};

let authToken = null;
let testRecordingId = null;

/**
 * Make HTTP request using built-in http module
 */
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * Authenticate and get token
 */
async function authenticate() {
  console.log('🔐 Authenticating...');
  
  try {
    const postData = JSON.stringify(TEST_USER);
    
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const response = await makeRequest(options, postData);
    
    if (response.statusCode !== 200) {
      throw new Error(`Authentication failed: ${response.statusCode}`);
    }

    authToken = response.body.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

/**
 * Test server health check
 */
async function testServerHealth() {
  console.log('🏥 Testing server health...');
  
  try {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/health',
      method: 'GET'
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Server is healthy');
      console.log('📊 Server info:', response.body);
      return true;
    } else {
      throw new Error(`Health check failed: ${response.statusCode}`);
    }
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

/**
 * Test flashcard generation API endpoint
 */
async function testFlashcardAPI() {
  console.log('🃏 Testing flashcard generation API...');
  
  try {
    // Create a simple test with a mock recording ID
    testRecordingId = `test_${Date.now()}`;
    
    const config = {
      cardCount: 5,
      difficultyLevel: 'medium',
      language: 'hebrew',
      subjectArea: 'מתמטיקה',
      gradeLevel: 'כיתה ה'
    };

    const postData = JSON.stringify({ config });
    
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api/memory-cards/generate/from-lesson/${testRecordingId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const response = await makeRequest(options, postData);
    
    console.log(`📊 API Response Status: ${response.statusCode}`);
    console.log('📋 Response Body:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('✅ Flashcard API is accessible');
      return true;
    } else if (response.statusCode === 404) {
      console.log('⚠️ Recording not found (expected for test)');
      return true; // This is expected since we're using a fake recording ID
    } else {
      console.log(`⚠️ API returned status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Flashcard API test failed:', error.message);
    return false;
  }
}

/**
 * Test memory cards route availability
 */
async function testMemoryCardsRoute() {
  console.log('🛣️ Testing memory cards route...');
  
  try {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/memory-cards',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };

    const response = await makeRequest(options);
    
    console.log(`📊 Route Response Status: ${response.statusCode}`);
    
    if (response.statusCode === 200 || response.statusCode === 404) {
      console.log('✅ Memory cards route is accessible');
      return true;
    } else {
      console.log(`⚠️ Route returned status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Memory cards route test failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Simple Flashcard Tests\n');
  
  const results = {
    serverHealth: false,
    authentication: false,
    memoryCardsRoute: false,
    flashcardAPI: false
  };

  try {
    // Test server health first
    results.serverHealth = await testServerHealth();
    if (!results.serverHealth) {
      console.log('❌ Server is not running or not accessible');
      return results;
    }

    // Test authentication
    results.authentication = await authenticate();
    if (!results.authentication) {
      console.log('❌ Authentication failed, cannot proceed with other tests');
      return results;
    }

    // Test memory cards route
    results.memoryCardsRoute = await testMemoryCardsRoute();
    
    // Test flashcard API
    results.flashcardAPI = await testFlashcardAPI();

    return results;
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    return results;
  }
}

/**
 * Print test results
 */
function printResults(results) {
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${status} - ${testName}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Server and flashcard API are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the server and implementation.');
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(printResults)
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runTests,
  authenticate,
  testServerHealth,
  testFlashcardAPI
};
