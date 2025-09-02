const { run, query, initializeDatabase } = require('../server/config/database-sqlite');
const fs = require('fs');
const path = require('path');

async function runUnifiedFlashcardsMigrationSQLite() {
  try {
    console.log('🚀 Starting unified flashcards migration for SQLite...');
    
    // Ensure database is initialized
    await initializeDatabase();
    
    // Step 1: Add new unified fields to memory_card_sets table
    console.log('📝 Adding unified fields to memory_card_sets table...');
    
    // Check existing columns
    const existingColumns = await query(`PRAGMA table_info(memory_card_sets)`);
    const columnNames = existingColumns.rows.map(col => col.name);
    
    // Add new columns if they don't exist
    const newColumns = [
      { name: 'set_type', definition: 'TEXT NOT NULL DEFAULT \'manual\' CHECK (set_type IN (\'manual\', \'lesson_generated\', \'ai_generated\'))' },
      { name: 'source_type', definition: 'TEXT DEFAULT \'manual\' CHECK (source_type IN (\'manual\', \'recording\', \'lesson\', \'ai_processing\'))' },
      { name: 'source_id', definition: 'INTEGER' },
      { name: 'difficulty_level', definition: 'TEXT DEFAULT \'medium\' CHECK (difficulty_level IN (\'easy\', \'medium\', \'hard\', \'mixed\'))' },
      { name: 'learning_objectives', definition: 'TEXT DEFAULT \'[]\'' },
      { name: 'is_active', definition: 'BOOLEAN DEFAULT 1' },
      { name: 'is_shared', definition: 'BOOLEAN DEFAULT 0' },
      { name: 'shared_with', definition: 'TEXT DEFAULT \'[]\'' },
      { name: 'ai_provider', definition: 'TEXT' },
      { name: 'model_version', definition: 'TEXT' },
      { name: 'confidence_score', definition: 'REAL DEFAULT 0.0' },
      { name: 'processing_metadata', definition: 'TEXT DEFAULT \'{}\'' },
      { name: 'tags', definition: 'TEXT DEFAULT \'[]\'' }
    ];
    
    for (const column of newColumns) {
      if (!columnNames.includes(column.name)) {
        console.log(`   Adding column: ${column.name}`);
        await run(`ALTER TABLE memory_card_sets ADD COLUMN ${column.name} ${column.definition}`);
      }
    }
    
    // Step 2: Add new fields to memory_cards table
    console.log('📝 Adding AI generation fields to memory_cards table...');
    
    const cardColumns = await query(`PRAGMA table_info(memory_cards)`);
    const cardColumnNames = cardColumns.rows.map(col => col.name);
    
    const newCardColumns = [
      { name: 'ai_generated', definition: 'BOOLEAN DEFAULT 0' },
      { name: 'ai_provider', definition: 'TEXT' },
      { name: 'confidence_score', definition: 'REAL DEFAULT 0.0' },
      { name: 'generation_metadata', definition: 'TEXT DEFAULT \'{}\'' }
    ];
    
    for (const column of newCardColumns) {
      if (!cardColumnNames.includes(column.name)) {
        console.log(`   Adding column: ${column.name}`);
        await run(`ALTER TABLE memory_cards ADD COLUMN ${column.name} ${column.definition}`);
      }
    }
    
    // Step 3: Create card generation jobs table if it doesn't exist
    console.log('📝 Creating card generation jobs table...');
    await run(`
      CREATE TABLE IF NOT EXISTS card_generation_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        recording_id INTEGER,
        text_length INTEGER,
        generation_config TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        result_metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
      )
    `);
    
    // Step 4: Create card generation logs table
    console.log('📝 Creating card generation logs table...');
    await run(`
      CREATE TABLE IF NOT EXISTS card_generation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        user_id INTEGER NOT NULL,
        recording_id INTEGER,
        cards_generated INTEGER DEFAULT 0,
        ai_provider TEXT,
        generation_config TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES card_generation_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
      )
    `);
    
    // Step 5: Create indexes for new columns
    console.log('📝 Creating indexes for unified flashcard fields...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_memory_card_sets_set_type ON memory_card_sets(set_type)',
      'CREATE INDEX IF NOT EXISTS idx_memory_card_sets_source_type ON memory_card_sets(source_type)',
      'CREATE INDEX IF NOT EXISTS idx_memory_card_sets_source_id ON memory_card_sets(source_id)',
      'CREATE INDEX IF NOT EXISTS idx_memory_card_sets_is_active ON memory_card_sets(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_memory_cards_ai_generated ON memory_cards(ai_generated)',
      'CREATE INDEX IF NOT EXISTS idx_memory_cards_ai_provider ON memory_cards(ai_provider)',
      'CREATE INDEX IF NOT EXISTS idx_card_generation_jobs_user_id ON card_generation_jobs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_card_generation_jobs_recording_id ON card_generation_jobs(recording_id)',
      'CREATE INDEX IF NOT EXISTS idx_card_generation_jobs_status ON card_generation_jobs(status)',
      'CREATE INDEX IF NOT EXISTS idx_card_generation_logs_user_id ON card_generation_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_card_generation_logs_recording_id ON card_generation_logs(recording_id)'
    ];
    
    for (const indexSql of indexes) {
      await run(indexSql);
    }
    
    // Step 6: Update existing manual sets to have proper set_type
    console.log('🔄 Updating existing manual sets...');
    const updateResult = await run(`
      UPDATE memory_card_sets 
      SET set_type = 'manual', source_type = 'manual'
      WHERE set_type IS NULL OR set_type = ''
    `);
    console.log(`✅ Updated ${updateResult.changes} manual sets`);
    
    // Step 7: Create views for statistics and compatibility
    console.log('📊 Creating unified views...');
    
    // Lesson flashcard sets view
    await run(`
      CREATE VIEW IF NOT EXISTS lesson_flashcard_sets AS
      SELECT 
        id,
        user_id,
        source_id as recording_id,
        name as set_name,
        description,
        set_type,
        subject_area,
        grade_level,
        total_cards,
        difficulty_level,
        learning_objectives,
        confidence_score,
        ai_provider,
        model_version,
        processing_metadata as metadata,
        tags,
        is_public,
        is_active,
        created_at,
        updated_at
      FROM memory_card_sets 
      WHERE set_type IN ('lesson_generated', 'ai_generated') 
      AND source_type IN ('recording', 'lesson', 'ai_processing')
    `);
    
    // Manual flashcard sets view
    await run(`
      CREATE VIEW IF NOT EXISTS manual_flashcard_sets AS
      SELECT 
        id,
        user_id,
        name,
        description,
        subject_area,
        grade_level,
        total_cards,
        difficulty_level,
        tags,
        is_public,
        is_active,
        created_at,
        updated_at
      FROM memory_card_sets 
      WHERE set_type = 'manual' 
      AND source_type = 'manual'
    `);
    
    // Flashcard statistics view
    await run(`
      CREATE VIEW IF NOT EXISTS flashcard_statistics AS
      SELECT 
        user_id,
        COUNT(*) as total_sets,
        SUM(CASE WHEN set_type = 'manual' THEN 1 ELSE 0 END) as manual_sets,
        SUM(CASE WHEN set_type IN ('lesson_generated', 'ai_generated') THEN 1 ELSE 0 END) as lesson_sets,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_sets,
        SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) as public_sets,
        SUM(CASE WHEN is_shared = 1 THEN 1 ELSE 0 END) as shared_sets,
        SUM(total_cards) as total_cards,
        COUNT(DISTINCT subject_area) as subjects_covered,
        COUNT(DISTINCT grade_level) as grade_levels_covered
      FROM memory_card_sets 
      WHERE is_active = 1
      GROUP BY user_id
    `);
    
    // Step 8: Verify the migration
    console.log('🔍 Verifying migration results...');
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_sets,
        SUM(CASE WHEN set_type = 'manual' THEN 1 ELSE 0 END) as manual_sets,
        SUM(CASE WHEN set_type = 'lesson_generated' THEN 1 ELSE 0 END) as lesson_sets,
        SUM(CASE WHEN set_type = 'ai_generated' THEN 1 ELSE 0 END) as ai_sets,
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
    const viewTest = await query(`
      SELECT 
        user_id,
        total_sets,
        manual_sets,
        lesson_sets,
        total_cards
      FROM flashcard_statistics 
      LIMIT 5
    `);
    
    console.log('📈 Sample flashcard statistics:');
    viewTest.rows.forEach(row => {
      console.log(`   User ${row.user_id}: ${row.total_sets} sets (${row.manual_sets} manual, ${row.lesson_sets} lesson), ${row.total_cards} cards`);
    });
    
    console.log('🎉 Unified flashcards migration completed successfully!');
    
    return {
      success: true,
      totalSets: stats.total_sets,
      manualSets: stats.manual_sets,
      lessonSets: stats.lesson_sets,
      aiSets: stats.ai_sets,
      totalCards: stats.total_cards
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  runUnifiedFlashcardsMigrationSQLite()
    .then((result) => {
      console.log('✅ Migration script completed successfully');
      console.log('📊 Final stats:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runUnifiedFlashcardsMigrationSQLite };
