const http = require('http');

// Test the unified tests API
function testAPI(endpoint, description) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ ${description}:`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Data:`, result);
          resolve(result);
        } catch (error) {
          console.log(`❌ ${description} - JSON Parse Error:`, error.message);
          console.log(`   Raw response:`, data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${description} - Request Error:`, error.message);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Unified Tests API...\n');

  try {
    // Test 1: Get all tests
    await testAPI('/api/tests', 'GET /api/tests - Fetch all tests');
    console.log('');

    // Test 2: Get test statistics
    await testAPI('/api/tests/stats', 'GET /api/tests/stats - Fetch test statistics');
    console.log('');

    // Test 3: Get lesson tests (backward compatibility)
    await testAPI('/api/ai-content/question-sets', 'GET /api/ai-content/question-sets - Backward compatibility');
    console.log('');

    console.log('🎉 All API tests completed!');

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run tests
runTests();
