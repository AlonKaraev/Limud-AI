const fetch = require('node-fetch');
const path = require('path');

// Test script to identify media loading issues
async function testMediaLoadingIssues() {
  console.log('🔍 Testing Media Loading Issues...\n');

  // Test configuration
  const baseUrl = 'http://localhost:5000';
  const testToken = 'test-token'; // This would normally be a valid JWT token

  const tests = [
    {
      name: 'Test Recordings API',
      endpoint: '/api/recordings',
      description: 'Test if recordings list loads properly'
    },
    {
      name: 'Test Documents API',
      endpoint: '/api/documents',
      description: 'Test if documents list loads properly'
    },
    {
      name: 'Test Images API',
      endpoint: '/api/images',
      description: 'Test if images list loads properly'
    },
    {
      name: 'Test Server Health',
      endpoint: '/health',
      description: 'Test if server is responding'
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n📋 ${test.name}`);
    console.log(`   ${test.description}`);
    console.log(`   Endpoint: ${test.endpoint}`);

    try {
      const startTime = Date.now();
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add auth header for protected endpoints
      if (test.endpoint !== '/health') {
        headers['Authorization'] = `Bearer ${testToken}`;
      }

      const response = await fetch(`${baseUrl}${test.endpoint}`, {
        method: 'GET',
        headers,
        timeout: 10000 // 10 second timeout
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const result = {
        test: test.name,
        endpoint: test.endpoint,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        success: response.ok,
        contentType,
        dataSize: JSON.stringify(responseData).length,
        data: responseData
      };

      results.push(result);

      if (response.ok) {
        console.log(`   ✅ SUCCESS - Status: ${response.status}, Time: ${responseTime}ms`);
        
        if (typeof responseData === 'object' && responseData !== null) {
          if (responseData.success !== undefined) {
            console.log(`   📊 API Success: ${responseData.success}`);
          }
          
          // Check for data arrays
          const dataKeys = ['recordings', 'documents', 'images'];
          for (const key of dataKeys) {
            if (responseData[key]) {
              console.log(`   📦 ${key}: ${responseData[key].length} items`);
            }
          }
          
          // Check for pagination
          if (responseData.pagination) {
            console.log(`   📄 Pagination: ${responseData.pagination.total} total items`);
          }
          
          // Check for errors
          if (responseData.error) {
            console.log(`   ⚠️  API Error: ${responseData.error}`);
          }
        }
      } else {
        console.log(`   ❌ FAILED - Status: ${response.status} ${response.statusText}`);
        console.log(`   📝 Response: ${JSON.stringify(responseData, null, 2)}`);
      }

    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      
      const result = {
        test: test.name,
        endpoint: test.endpoint,
        success: false,
        error: error.message,
        errorType: error.name,
        responseTime: 'timeout/error'
      };
      
      results.push(result);

      // Analyze common error types
      if (error.message.includes('ECONNREFUSED')) {
        console.log(`   🔌 Server appears to be down or not listening on port`);
      } else if (error.message.includes('timeout')) {
        console.log(`   ⏱️  Request timed out - server may be overloaded`);
      } else if (error.message.includes('ENOTFOUND')) {
        console.log(`   🌐 DNS resolution failed - check server URL`);
      }
    }
  }

  // Summary analysis
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY ANALYSIS');
  console.log('='.repeat(60));

  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);

  console.log(`\n✅ Successful tests: ${successfulTests.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failedTests.length}/${results.length}`);

  if (failedTests.length > 0) {
    console.log('\n🔍 FAILURE ANALYSIS:');
    
    const errorTypes = {};
    failedTests.forEach(test => {
      const errorKey = test.error || `HTTP ${test.status}`;
      errorTypes[errorKey] = (errorTypes[errorKey] || 0) + 1;
    });

    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`   • ${error}: ${count} occurrence(s)`);
    });
  }

  // Response time analysis
  const responseTimes = results
    .filter(r => r.responseTime && r.responseTime !== 'timeout/error')
    .map(r => parseInt(r.responseTime.replace('ms', '')));

  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    console.log('\n⏱️  RESPONSE TIME ANALYSIS:');
    console.log(`   • Average: ${Math.round(avgResponseTime)}ms`);
    console.log(`   • Minimum: ${minResponseTime}ms`);
    console.log(`   • Maximum: ${maxResponseTime}ms`);

    if (avgResponseTime > 2000) {
      console.log(`   ⚠️  Average response time is high (>${avgResponseTime}ms)`);
    }
  }

  // Specific media loading issues
  console.log('\n🎬 MEDIA LOADING SPECIFIC ISSUES:');
  
  const mediaEndpoints = results.filter(r => 
    r.endpoint.includes('/recordings') || 
    r.endpoint.includes('/documents') || 
    r.endpoint.includes('/images')
  );

  mediaEndpoints.forEach(result => {
    if (!result.success) {
      console.log(`\n❌ ${result.test}:`);
      
      if (result.status === 401) {
        console.log('   🔐 Authentication issue - token may be invalid or expired');
      } else if (result.status === 500) {
        console.log('   💥 Server error - check database connection and server logs');
      } else if (result.status === 404) {
        console.log('   🔍 Endpoint not found - check route configuration');
      } else if (result.error) {
        console.log(`   🐛 Network/Connection error: ${result.error}`);
      }
    } else if (result.data) {
      // Analyze successful responses for potential issues
      if (result.data.success === false) {
        console.log(`\n⚠️  ${result.test} returned success=false:`);
        console.log(`   📝 Error: ${result.data.error || 'Unknown error'}`);
      } else if (result.data.success === true) {
        const dataKey = result.endpoint.includes('/recordings') ? 'recordings' :
                        result.endpoint.includes('/documents') ? 'documents' :
                        result.endpoint.includes('/images') ? 'images' : null;
        
        if (dataKey && result.data[dataKey]) {
          console.log(`\n✅ ${result.test} loaded successfully:`);
          console.log(`   📦 Items: ${result.data[dataKey].length}`);
          
          if (result.data.pagination) {
            console.log(`   📄 Total available: ${result.data.pagination.total}`);
          }
        }
      }
    }
  });

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (failedTests.some(t => t.error && t.error.includes('ECONNREFUSED'))) {
    console.log('   1. ✅ Start the server: npm run dev or node server/app.js');
  }
  
  if (failedTests.some(t => t.status === 401)) {
    console.log('   2. 🔐 Check authentication - ensure valid JWT token');
  }
  
  if (failedTests.some(t => t.status === 500)) {
    console.log('   3. 🗄️  Check database connection and schema');
    console.log('   4. 📋 Review server logs for detailed error messages');
  }
  
  if (responseTimes.some(t => t > 3000)) {
    console.log('   5. ⚡ Optimize database queries and add proper indexing');
  }
  
  if (results.some(r => r.data && r.data.success === false)) {
    console.log('   6. 🔍 Check API error handling and return proper error responses');
  }

  console.log('\n📝 DETAILED RESULTS:');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

// Database connection test
async function testDatabaseConnection() {
  console.log('\n🗄️  Testing Database Connection...');
  
  try {
    const { query } = require('./server/config/database-sqlite');
    
    // Test basic connection
    const result = await query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Test media tables existence
    const tables = ['recordings', 'documents', 'images'];
    
    for (const table of tables) {
      try {
        const tableInfo = await query(`PRAGMA table_info(${table})`);
        if (tableInfo.rows.length > 0) {
          console.log(`✅ Table '${table}' exists with ${tableInfo.rows.length} columns`);
          
          // Test record count
          const count = await query(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`   📊 Records: ${count.rows[0].count}`);
        } else {
          console.log(`❌ Table '${table}' does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error checking table '${table}': ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    
    if (error.message.includes('SQLITE_CANTOPEN')) {
      console.log('   💡 Database file may not exist or be accessible');
    } else if (error.message.includes('no such table')) {
      console.log('   💡 Database schema may not be initialized');
    }
  }
}

// Race condition test
async function testRaceConditions() {
  console.log('\n🏃 Testing for Race Conditions...');
  
  const baseUrl = 'http://localhost:5000';
  const testToken = 'test-token';
  
  // Simulate multiple concurrent requests
  const concurrentRequests = 5;
  const endpoints = ['/api/recordings', '/api/documents', '/api/images'];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing concurrent requests to ${endpoint}`);
    
    const promises = [];
    const startTime = Date.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      const promise = fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }).then(async (response) => {
        const data = await response.json();
        return {
          requestId: i,
          status: response.status,
          success: response.ok,
          dataLength: data && data.recordings ? data.recordings.length : 
                     data && data.documents ? data.documents.length :
                     data && data.images ? data.images.length : 0,
          error: data.error
        };
      }).catch(error => ({
        requestId: i,
        success: false,
        error: error.message
      }));
      
      promises.push(promise);
    }
    
    try {
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log(`   ⏱️  Total time: ${totalTime}ms`);
      console.log(`   ✅ Successful: ${successful.length}/${concurrentRequests}`);
      console.log(`   ❌ Failed: ${failed.length}/${concurrentRequests}`);
      
      // Check for inconsistent results
      const dataLengths = successful.map(r => r.dataLength);
      const uniqueLengths = [...new Set(dataLengths)];
      
      if (uniqueLengths.length > 1) {
        console.log(`   ⚠️  Inconsistent data lengths: ${uniqueLengths.join(', ')}`);
        console.log('   💡 This may indicate race conditions or caching issues');
      } else if (uniqueLengths.length === 1) {
        console.log(`   ✅ Consistent data length: ${uniqueLengths[0]} items`);
      }
      
      if (failed.length > 0) {
        console.log('   🔍 Failed request details:');
        failed.forEach(f => {
          console.log(`     Request ${f.requestId}: ${f.error}`);
        });
      }
      
    } catch (error) {
      console.log(`   💥 Concurrent test failed: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Media Loading Issues Analysis');
  console.log('==========================================\n');
  
  // Test database first
  await testDatabaseConnection();
  
  // Test API endpoints
  await testMediaLoadingIssues();
  
  // Test race conditions
  await testRaceConditions();
  
  console.log('\n🏁 Analysis Complete!');
  console.log('\nNext steps:');
  console.log('1. Review the detailed results above');
  console.log('2. Check server logs for additional error details');
  console.log('3. Verify database schema and data integrity');
  console.log('4. Test with valid authentication tokens');
  console.log('5. Monitor response times under load');
}

// Run the analysis
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testMediaLoadingIssues,
  testDatabaseConnection,
  testRaceConditions
};
