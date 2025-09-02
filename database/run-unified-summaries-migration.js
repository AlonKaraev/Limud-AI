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

async function runUnifiedSummariesMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Starting unified summaries migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'unified-summaries-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    console.log('📋 Creating unified summaries table and related objects...');
    await pool.query(schemaSql);
    console.log('✅ Unified summaries schema created successfully');
    
    // Run the migration function to move existing data
    console.log('🔄 Migrating existing content_summaries to unified table...');
    const migrationResult = await pool.query('SELECT migrate_content_summaries()');
    const migratedCount = migrationResult.rows[0].migrate_content_summaries;
    console.log(`✅ Migrated ${migratedCount} lesson summaries to unified table`);
    
    // Verify the migration
    console.log('🔍 Verifying migration results...');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_summaries,
        COUNT(*) FILTER (WHERE summary_type = 'manual') as manual_summaries,
        COUNT(*) FILTER (WHERE summary_type = 'lesson_generated') as lesson_summaries,
        COUNT(*) FILTER (WHERE summary_type = 'ai_generated') as ai_generated_summaries
      FROM summaries
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 Migration Statistics:');
    console.log(`   Total summaries: ${stats.total_summaries}`);
    console.log(`   Manual summaries: ${stats.manual_summaries}`);
    console.log(`   Lesson summaries: ${stats.lesson_summaries}`);
    console.log(`   AI generated summaries: ${stats.ai_generated_summaries}`);
    
    // Test the new functions
    console.log('🧪 Testing new database functions...');
    
    // Test summary statistics view
    const userStatsResult = await pool.query(`
      SELECT * FROM summary_statistics LIMIT 5
    `);
    console.log(`✅ Summary statistics view working - found stats for ${userStatsResult.rows.length} users`);
    
    // Test get_summary_with_source function if there are summaries
    if (stats.total_summaries > 0) {
      const testSummaryResult = await pool.query(`
        SELECT * FROM get_summary_with_source((SELECT id FROM summaries LIMIT 1))
      `);
      if (testSummaryResult.rows.length > 0) {
        console.log('✅ get_summary_with_source function working correctly');
      }
    }
    
    console.log('🎉 Unified summaries migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Update SummariesManager to use the new unified API');
    console.log('   2. Update AI processing to create lesson summaries in unified table');
    console.log('   3. Update TeacherDashboard statistics to include lesson summaries');
    console.log('   4. Test the integration end-to-end');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runUnifiedSummariesMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runUnifiedSummariesMigration };
