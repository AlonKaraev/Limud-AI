const { query } = require('../server/config/database-sqlite');

async function testMigration() {
  try {
    // Check if unified_summaries table exists
    const tableCheck = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='unified_summaries'
    `);
    
    console.log('Table exists:', tableCheck.rows.length > 0 ? 'YES' : 'NO');
    
    if (tableCheck.rows.length > 0) {
      // Get table structure
      const structure = await query('PRAGMA table_info(unified_summaries)');
      console.log('Table structure:');
      structure.rows.forEach(col => {
        console.log(`  ${col.name}: ${col.type}`);
      });
      
      // Get count of records
      const count = await query('SELECT COUNT(*) as count FROM unified_summaries');
      console.log(`Records in table: ${count.rows[0].count}`);
      
      // Test statistics query
      const stats = await query(`
        SELECT 
          COUNT(*) as total_summaries,
          COUNT(CASE WHEN summary_type = 'manual' THEN 1 END) as manual_summaries,
          COUNT(CASE WHEN summary_type = 'lesson' THEN 1 END) as lesson_summaries,
          COUNT(CASE WHEN summary_type = 'ai' THEN 1 END) as ai_summaries,
          COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_summaries
        FROM unified_summaries
      `);
      
      console.log('Statistics:');
      console.log(`  Total: ${stats.rows[0].total_summaries}`);
      console.log(`  Manual: ${stats.rows[0].manual_summaries}`);
      console.log(`  Lesson: ${stats.rows[0].lesson_summaries}`);
      console.log(`  AI: ${stats.rows[0].ai_summaries}`);
      console.log(`  Public: ${stats.rows[0].public_summaries}`);
    }
    
  } catch (error) {
    console.error('Error testing migration:', error);
  }
}

testMigration();
