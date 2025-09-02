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

async function runUnifiedFlashcardsMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Starting unified flashcards migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'unified-flashcards-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    console.log('📝 Executing unified flashcards schema...');
    await pool.query(schema);
    console.log('✅ Schema executed successfully');
    
    // Run migration function to convert existing data
    console.log('🔄 Migrating existing card generation jobs to unified sets...');
    const migrationResult = await pool.query('SELECT migrate_card_generation_to_unified_sets()');
    const migratedCount = migrationResult.rows[0].migrate_card_generation_to_unified_sets;
    console.log(`✅ Migrated ${migratedCount} card generation jobs to unified sets`);
    
    // Update existing manual sets to have proper set_type
    console.log('🔄 Updating existing manual sets...');
    const updateResult = await pool.query(`
      UPDATE memory_card_sets 
      SET set_type = 'manual', source_type = 'manual'
      WHERE set_type IS NULL OR set_type = ''
    `);
    console.log(`✅ Updated ${updateResult.rowCount} manual sets`);
    
    // Verify the migration
    console.log('🔍 Verifying migration results...');
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sets,
        COUNT(*) FILTER (WHERE set_type = 'manual') as manual_sets,
        COUNT(*) FILTER (WHERE set_type = 'lesson_generated') as lesson_sets,
        COUNT(*) FILTER (WHERE set_type = 'ai_generated') as ai_sets,
        SUM(total_cards) as total_cards
      FROM memory_card_sets
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 Migration Statistics:');
    console.log(`   Total Sets: ${stats.total_sets}`);
    console.log(`   Manual Sets: ${stats.manual_sets}`);
    console.log(`   Lesson Sets: ${stats.lesson_sets}`);
    console.log(`   AI Sets: ${stats.ai_sets}`);
    console.log(`   Total Cards: ${stats.total_cards}`);
    
    // Test the new views
    console.log('🧪 Testing new views...');
    const viewTest = await pool.query(`
      SELECT 
        user_id,
        total_flashcard_sets,
        manual_flashcard_sets,
        lesson_flashcard_sets,
        total_flashcards
      FROM overview_statistics 
      LIMIT 5
    `);
    
    console.log('📈 Sample overview statistics:');
    viewTest.rows.forEach(row => {
      console.log(`   User ${row.user_id}: ${row.total_flashcard_sets} sets (${row.manual_flashcard_sets} manual, ${row.lesson_flashcard_sets} lesson), ${row.total_flashcards} cards`);
    });
    
    console.log('🎉 Unified flashcards migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runUnifiedFlashcardsMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runUnifiedFlashcardsMigration };
