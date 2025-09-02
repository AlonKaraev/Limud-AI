const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'limudai_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function runUnifiedTestsMigration() {
  const pool = new Pool(dbConfig);
  const client = await pool.connect();

  try {
    console.log('🚀 Starting unified tests migration...');

    // Begin transaction
    await client.query('BEGIN');

    // Read and execute the unified tests schema
    const schemaPath = path.join(__dirname, 'unified-tests-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📋 Creating unified tests tables and functions...');
    await client.query(schemaSql);

    // Run the migration function to move existing question sets to tests
    console.log('🔄 Migrating existing question sets to unified tests table...');
    const migrationResult = await client.query('SELECT migrate_question_sets_to_tests() as migrated_count');
    const migratedCount = migrationResult.rows[0].migrated_count;

    console.log(`✅ Successfully migrated ${migratedCount} question sets to tests table`);

    // Update question counts for migrated tests
    console.log('🔢 Updating question counts for migrated tests...');
    await client.query(`
      UPDATE tests 
      SET question_count = (
        SELECT COUNT(*) 
        FROM test_questions 
        WHERE test_questions.test_id = tests.id
      )
      WHERE test_type IN ('lesson_generated', 'ai_generated')
      AND question_count = 0
    `);

    // Verify migration results
    console.log('🔍 Verifying migration results...');
    
    const testStats = await client.query(`
      SELECT 
        COUNT(*) as total_tests,
        COUNT(*) FILTER (WHERE test_type = 'manual') as manual_tests,
        COUNT(*) FILTER (WHERE test_type = 'lesson_generated') as lesson_tests,
        COUNT(*) FILTER (WHERE test_type = 'ai_generated') as ai_tests,
        SUM(question_count) as total_questions
      FROM tests
    `);

    const questionStats = await client.query(`
      SELECT 
        COUNT(*) as total_questions,
        COUNT(*) FILTER (WHERE ai_generated = true) as ai_generated_questions,
        COUNT(*) FILTER (WHERE ai_generated = false) as manual_questions
      FROM test_questions
    `);

    const optionStats = await client.query(`
      SELECT COUNT(*) as total_options
      FROM test_question_options
    `);

    console.log('\n📊 Migration Summary:');
    console.log(`   Tests: ${testStats.rows[0].total_tests} total`);
    console.log(`   - Manual: ${testStats.rows[0].manual_tests}`);
    console.log(`   - Lesson Generated: ${testStats.rows[0].lesson_tests}`);
    console.log(`   - AI Generated: ${testStats.rows[0].ai_tests}`);
    console.log(`   Questions: ${questionStats.rows[0].total_questions} total`);
    console.log(`   - AI Generated: ${questionStats.rows[0].ai_generated_questions}`);
    console.log(`   - Manual: ${questionStats.rows[0].manual_questions}`);
    console.log(`   Options: ${optionStats.rows[0].total_options} total`);

    // Test the views
    console.log('\n🔍 Testing views...');
    
    const lessonTestsView = await client.query('SELECT COUNT(*) as count FROM lesson_tests');
    console.log(`   lesson_tests view: ${lessonTestsView.rows[0].count} records`);
    
    const manualTestsView = await client.query('SELECT COUNT(*) as count FROM manual_tests');
    console.log(`   manual_tests view: ${manualTestsView.rows[0].count} records`);
    
    const testStatsView = await client.query('SELECT COUNT(*) as count FROM test_statistics');
    console.log(`   test_statistics view: ${testStatsView.rows[0].count} user records`);

    // Test the functions
    console.log('\n🧪 Testing functions...');
    
    // Test get_test_with_source function with a sample test
    const sampleTest = await client.query('SELECT id FROM tests LIMIT 1');
    if (sampleTest.rows.length > 0) {
      const testWithSource = await client.query(
        'SELECT * FROM get_test_with_source($1)', 
        [sampleTest.rows[0].id]
      );
      console.log(`   get_test_with_source function: ${testWithSource.rows.length > 0 ? 'Working' : 'No data'}`);
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n✅ Unified tests migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update backend routes to use unified tests table');
    console.log('   2. Update frontend components to handle unified tests');
    console.log('   3. Test lesson-generated test creation from cards');
    console.log('   4. Verify statistics counting in overview tab');

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runUnifiedTestsMigration()
    .then(() => {
      console.log('\n🎉 Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runUnifiedTestsMigration };
