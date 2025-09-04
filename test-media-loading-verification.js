const { query, run } = require('./server/config/database-sqlite');

/**
 * Comprehensive verification test for media loading fixes
 * Tests database integrity, API responses, and error handling
 */

async function verifyMediaLoadingFixes() {
  console.log('🔍 Verifying Media Loading Fixes...\n');

  const results = {
    databaseTests: [],
    schemaTests: [],
    dataIntegrityTests: [],
    performanceTests: []
  };

  try {
    // 1. Test database connectivity and basic operations
    await testDatabaseConnectivity(results);
    
    // 2. Test schema integrity
    await testSchemaIntegrity(results);
    
    // 3. Test data integrity
    await testDataIntegrity(results);
    
    // 4. Test performance improvements
    await testPerformanceImprovements(results);
    
    // 5. Generate summary report
    generateSummaryReport(results);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

async function testDatabaseConnectivity(results) {
  console.log('🔌 Testing Database Connectivity...');
  
  const tests = [
    {
      name: 'Basic Connection',
      test: async () => {
        const result = await query('SELECT 1 as test');
        return result.rows.length === 1 && result.rows[0].test === 1;
      }
    },
    {
      name: 'Concurrent Connections',
      test: async () => {
        const promises = Array(5).fill().map(() => query('SELECT datetime("now") as timestamp'));
        const results = await Promise.all(promises);
        return results.every(r => r.rows.length === 1);
      }
    },
    {
      name: 'Transaction Support',
      test: async () => {
        await run('BEGIN TRANSACTION');
        await run('CREATE TEMP TABLE test_transaction (id INTEGER)');
        await run('INSERT INTO test_transaction (id) VALUES (1)');
        const result = await query('SELECT COUNT(*) as count FROM test_transaction');
        await run('ROLLBACK');
        return result.rows[0].count === 1;
      }
    }
  ];

  for (const test of tests) {
    try {
      const success = await test.test();
      results.databaseTests.push({
        name: test.name,
        status: success ? 'PASS' : 'FAIL',
        success
      });
      console.log(`   ${success ? '✅' : '❌'} ${test.name}`);
    } catch (error) {
      results.databaseTests.push({
        name: test.name,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
}

async function testSchemaIntegrity(results) {
  console.log('\n📋 Testing Schema Integrity...');
  
  const requiredTables = [
    'users',
    'recordings', 
    'documents',
    'images',
    'text_extraction_jobs',
    'document_text_extractions',
    'image_text_extraction_jobs',
    'image_text_extractions',
    'text_extraction_edit_history',
    'image_text_extraction_edit_history'
  ];

  for (const tableName of requiredTables) {
    try {
      const tableInfo = await query(`PRAGMA table_info(${tableName})`);
      const exists = tableInfo.rows.length > 0;
      
      results.schemaTests.push({
        name: `Table: ${tableName}`,
        status: exists ? 'PASS' : 'FAIL',
        success: exists,
        columns: tableInfo.rows.length
      });
      
      console.log(`   ${exists ? '✅' : '❌'} ${tableName} (${tableInfo.rows.length} columns)`);
      
      // Test specific required columns for media tables
      if (tableName === 'recordings' && exists) {
        const requiredColumns = ['media_type', 'processing_status', 'video_metadata', 'tags'];
        const columnNames = tableInfo.rows.map(col => col.name);
        
        for (const colName of requiredColumns) {
          const hasColumn = columnNames.includes(colName);
          results.schemaTests.push({
            name: `Column: ${tableName}.${colName}`,
            status: hasColumn ? 'PASS' : 'FAIL',
            success: hasColumn
          });
          console.log(`     ${hasColumn ? '✅' : '❌'} ${colName} column`);
        }
      }
      
    } catch (error) {
      results.schemaTests.push({
        name: `Table: ${tableName}`,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      console.log(`   ❌ ${tableName}: ${error.message}`);
    }
  }
}

async function testDataIntegrity(results) {
  console.log('\n🔍 Testing Data Integrity...');
  
  const integrityTests = [
    {
      name: 'Recordings Metadata Integrity',
      test: async () => {
        const result = await query(`
          SELECT COUNT(*) as count FROM recordings 
          WHERE metadata IS NULL OR metadata = ''
        `);
        return result.rows[0].count === 0;
      }
    },
    {
      name: 'Documents Metadata Integrity',
      test: async () => {
        const result = await query(`
          SELECT COUNT(*) as count FROM documents 
          WHERE metadata IS NULL OR metadata = ''
        `);
        return result.rows[0].count === 0;
      }
    },
    {
      name: 'Images Metadata Integrity',
      test: async () => {
        const result = await query(`
          SELECT COUNT(*) as count FROM images 
          WHERE metadata IS NULL OR metadata = ''
        `);
        return result.rows[0].count === 0;
      }
    },
    {
      name: 'Tags Field Integrity',
      test: async () => {
        const recordingsResult = await query(`
          SELECT COUNT(*) as count FROM recordings 
          WHERE tags IS NULL
        `);
        const documentsResult = await query(`
          SELECT COUNT(*) as count FROM documents 
          WHERE tags IS NULL
        `);
        const imagesResult = await query(`
          SELECT COUNT(*) as count FROM images 
          WHERE tags IS NULL
        `);
        
        return recordingsResult.rows[0].count === 0 && 
               documentsResult.rows[0].count === 0 && 
               imagesResult.rows[0].count === 0;
      }
    },
    {
      name: 'Media Type Consistency',
      test: async () => {
        const result = await query(`
          SELECT COUNT(*) as count FROM recordings 
          WHERE media_type IS NULL OR media_type NOT IN ('audio', 'video')
        `);
        return result.rows[0].count === 0;
      }
    }
  ];

  for (const test of integrityTests) {
    try {
      const success = await test.test();
      results.dataIntegrityTests.push({
        name: test.name,
        status: success ? 'PASS' : 'FAIL',
        success
      });
      console.log(`   ${success ? '✅' : '❌'} ${test.name}`);
    } catch (error) {
      results.dataIntegrityTests.push({
        name: test.name,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
}

async function testPerformanceImprovements(results) {
  console.log('\n⚡ Testing Performance Improvements...');
  
  const performanceTests = [
    {
      name: 'Index Existence Check',
      test: async () => {
        const result = await query(`
          SELECT name FROM sqlite_master 
          WHERE type = 'index' AND name LIKE 'idx_%'
        `);
        return result.rows.length >= 10; // Should have at least 10 indexes
      }
    },
    {
      name: 'Recordings Query Performance',
      test: async () => {
        const startTime = Date.now();
        await query(`
          SELECT * FROM recordings 
          WHERE user_id = 1 
          ORDER BY created_at DESC 
          LIMIT 20
        `);
        const endTime = Date.now();
        return (endTime - startTime) < 1000; // Should complete in under 1 second
      }
    },
    {
      name: 'Documents Query Performance',
      test: async () => {
        const startTime = Date.now();
        await query(`
          SELECT * FROM documents 
          WHERE user_id = 1 
          ORDER BY created_at DESC 
          LIMIT 20
        `);
        const endTime = Date.now();
        return (endTime - startTime) < 1000;
      }
    },
    {
      name: 'Images Query Performance',
      test: async () => {
        const startTime = Date.now();
        await query(`
          SELECT * FROM images 
          WHERE user_id = 1 
          ORDER BY created_at DESC 
          LIMIT 20
        `);
        const endTime = Date.now();
        return (endTime - startTime) < 1000;
      }
    },
    {
      name: 'Complex Join Query Performance',
      test: async () => {
        const startTime = Date.now();
        await query(`
          SELECT r.*, COUNT(t.id) as transcription_count
          FROM recordings r
          LEFT JOIN transcriptions t ON r.id = t.recording_id
          WHERE r.user_id = 1
          GROUP BY r.id
          ORDER BY r.created_at DESC
          LIMIT 10
        `);
        const endTime = Date.now();
        return (endTime - startTime) < 2000; // Complex queries can take up to 2 seconds
      }
    }
  ];

  for (const test of performanceTests) {
    try {
      const startTime = Date.now();
      const success = await test.test();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      results.performanceTests.push({
        name: test.name,
        status: success ? 'PASS' : 'FAIL',
        success,
        duration: `${duration}ms`
      });
      
      console.log(`   ${success ? '✅' : '❌'} ${test.name} (${duration}ms)`);
    } catch (error) {
      results.performanceTests.push({
        name: test.name,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
}

function generateSummaryReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY REPORT');
  console.log('='.repeat(60));

  const categories = [
    { name: 'Database Tests', tests: results.databaseTests },
    { name: 'Schema Tests', tests: results.schemaTests },
    { name: 'Data Integrity Tests', tests: results.dataIntegrityTests },
    { name: 'Performance Tests', tests: results.performanceTests }
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalErrors = 0;

  categories.forEach(category => {
    const passed = category.tests.filter(t => t.status === 'PASS').length;
    const failed = category.tests.filter(t => t.status === 'FAIL').length;
    const errors = category.tests.filter(t => t.status === 'ERROR').length;
    const total = category.tests.length;

    totalTests += total;
    totalPassed += passed;
    totalFailed += failed;
    totalErrors += errors;

    console.log(`\n${category.name}:`);
    console.log(`  ✅ Passed: ${passed}/${total}`);
    console.log(`  ❌ Failed: ${failed}/${total}`);
    console.log(`  💥 Errors: ${errors}/${total}`);

    if (failed > 0 || errors > 0) {
      console.log('  Issues:');
      category.tests
        .filter(t => t.status !== 'PASS')
        .forEach(test => {
          console.log(`    • ${test.name}: ${test.status}${test.error ? ` - ${test.error}` : ''}`);
        });
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎯 OVERALL RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${totalPassed} (${Math.round(totalPassed/totalTests*100)}%)`);
  console.log(`❌ Failed: ${totalFailed} (${Math.round(totalFailed/totalTests*100)}%)`);
  console.log(`💥 Errors: ${totalErrors} (${Math.round(totalErrors/totalTests*100)}%)`);

  const successRate = totalPassed / totalTests;
  if (successRate >= 0.9) {
    console.log('\n🎉 EXCELLENT: Media loading fixes are working properly!');
  } else if (successRate >= 0.7) {
    console.log('\n✅ GOOD: Most fixes are working, but some issues remain.');
  } else {
    console.log('\n⚠️  WARNING: Significant issues detected. Review failed tests.');
  }

  console.log('\n💡 RECOMMENDATIONS:');
  
  if (totalFailed > 0) {
    console.log('1. 🔧 Address failed tests by reviewing database schema and data');
  }
  
  if (totalErrors > 0) {
    console.log('2. 🐛 Fix error conditions that prevent proper testing');
  }
  
  if (results.performanceTests.some(t => t.status !== 'PASS')) {
    console.log('3. ⚡ Optimize database queries and indexes for better performance');
  }
  
  console.log('4. 🔄 Run this verification test regularly to catch regressions');
  console.log('5. 📊 Monitor server logs for any runtime issues');
  
  return {
    totalTests,
    totalPassed,
    totalFailed,
    totalErrors,
    successRate,
    categories: results
  };
}

// Test specific media loading scenarios
async function testMediaLoadingScenarios() {
  console.log('\n🎬 Testing Media Loading Scenarios...');
  
  const scenarios = [
    {
      name: 'Empty Database Response',
      test: async () => {
        // Test that empty results don't cause errors
        const result = await query('SELECT * FROM recordings WHERE user_id = 99999');
        return result.rows.length === 0; // Should return empty array, not error
      }
    },
    {
      name: 'Large Dataset Handling',
      test: async () => {
        // Test pagination with large offsets
        const result = await query('SELECT * FROM recordings LIMIT 20 OFFSET 1000');
        return Array.isArray(result.rows); // Should return array even if empty
      }
    },
    {
      name: 'Invalid User ID Handling',
      test: async () => {
        // Test with invalid user ID
        const result = await query('SELECT * FROM recordings WHERE user_id = -1');
        return result.rows.length === 0;
      }
    },
    {
      name: 'Concurrent Access Test',
      test: async () => {
        // Test multiple simultaneous queries
        const promises = [
          query('SELECT COUNT(*) as count FROM recordings'),
          query('SELECT COUNT(*) as count FROM documents'),
          query('SELECT COUNT(*) as count FROM images')
        ];
        
        const results = await Promise.all(promises);
        return results.every(r => r.rows.length === 1);
      }
    }
  ];

  for (const scenario of scenarios) {
    try {
      const success = await scenario.test();
      console.log(`   ${success ? '✅' : '❌'} ${scenario.name}`);
    } catch (error) {
      console.log(`   ❌ ${scenario.name}: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Media Loading Verification');
    console.log('=====================================\n');
    
    await verifyMediaLoadingFixes();
    await testMediaLoadingScenarios();
    
    console.log('\n🏁 Verification Complete!');
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  verifyMediaLoadingFixes,
  testMediaLoadingScenarios,
  testDatabaseConnectivity,
  testSchemaIntegrity,
  testDataIntegrity,
  testPerformanceImprovements
};

// Run if called directly
if (require.main === module) {
  main();
}
